package com.englms.identity.internal.cli;

import static com.englms.identity.IdentityFixtures.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import com.englms.EnglmsApplication;
import com.englms.TestcontainersConfiguration;
import com.englms.identity.IdentityFixtures;
import com.englms.identity.Role;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ExitCodeGenerator;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.scheduling.config.ScheduledTaskHolder;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * T-M2.1 AC11, FR-AUTH-09: the runbooks §4 command in a context with web type {@code none}, as the operator runs it.
 */
@Tag("container")
@ExtendWith(OutputCaptureExtension.class)
class ResetTutorPasswordCliTest {

	static final Pattern PRINTED = Pattern.compile("Temporary password for the tutor 'Tutor\\.One': (\\S+)");

	static PostgreSQLContainer postgres;

	static JdbcTemplate jdbc;

	@BeforeAll
	static void startDatabase() {
		postgres = TestcontainersConfiguration.newPostgres();
		postgres.start();
		Flyway.configure()
			.dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
			.schemas("app")
			.defaultSchema("app")
			.load()
			.migrate();
		jdbc = new JdbcTemplate(new DriverManagerDataSource(postgres.getJdbcUrl() + "&currentSchema=app",
				postgres.getUsername(), postgres.getPassword()));
	}

	@AfterAll
	static void stopDatabase() {
		postgres.stop();
	}

	@BeforeEach
	void clean() {
		IdentityFixtures.reset(jdbc);
	}

	ConfigurableApplicationContext runCli() {
		return new SpringApplicationBuilder(EnglmsApplication.class).run("--spring.datasource.url=" + postgres.getJdbcUrl(),
				"--spring.datasource.username=" + postgres.getUsername(),
				"--spring.datasource.password=" + postgres.getPassword(),
				// Set as in production: the CLI never runs the bootstrap, even with the variables present.
				"--englms.bootstrap.tutor.username=someone.else", "--englms.bootstrap.tutor.password-file=/nonexistent",
				"--englms.cli=reset-tutor-password", "--spring.main.web-application-type=none");
	}

	@Test
	void printsOneTemporaryPasswordAndResetsTheTutor(CapturedOutput output) {
		UUID tutor = IdentityFixtures.insert(jdbc, "Tutor.One", PASSWORD, Role.TUTOR, false);
		jdbc.update("UPDATE user_account SET failed_login_count = 4, locked_until = now() + interval '10 minutes'");
		jdbc.update("""
				INSERT INTO spring_session (primary_id, session_id, creation_time, last_access_time, max_inactive_interval,
				    expiry_time, principal_name)
				VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 0, 0, 43200,
				    9999999999999, ?)""", tutor.toString());
		jdbc.update("INSERT INTO persistent_logins (username, series, token, last_used) VALUES (?, 'series-1', 'token-1', now())",
				tutor.toString());
		Instant before = Instant.now();

		try (ConfigurableApplicationContext context = runCli()) {
			assertThat(context.containsBean("tutorBootstrap")).as("no bootstrap in the CLI context").isFalse();
			assertThat(context.getBeansOfType(ScheduledTaskHolder.class).values())
				.as("no scheduled job in the CLI context")
				.allSatisfy(holder -> assertThat(holder.getScheduledTasks()).isEmpty());
			assertThat(context.getBeansOfType(ApplicationRunner.class)).hasSize(1);
		}

		Matcher printed = PRINTED.matcher(output.getOut());
		assertThat(printed.find()).as(output.getOut()).isTrue();
		String temporary = printed.group(1);
		assertThat(temporary).matches("[a-z]+-[a-z]+-[a-z]+-[0-9]{2}");
		assertThat(printed.find()).as("printed once").isFalse();
		Map<String, Object> row = jdbc.queryForMap("SELECT * FROM user_account WHERE id = ?", tutor);
		assertThat(PasswordEncoderFactories.createDelegatingPasswordEncoder()
			.matches(temporary, (String) row.get("password_hash"))).isTrue();
		assertThat(row).containsEntry("must_change_password", true).containsEntry("failed_login_count", 0);
		assertThat(row.get("locked_until")).isNull();
		Instant expires = ((java.sql.Timestamp) row.get("temp_password_expires_at")).toInstant();
		assertThat(expires).isBetween(before.plus(Duration.ofDays(7)).minusSeconds(5), Instant.now().plus(Duration.ofDays(7)));
		assertThat(jdbc.queryForObject("SELECT count(*) FROM spring_session", Integer.class)).isZero();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM persistent_logins", Integer.class)).isZero();
		assertThat(jdbc.queryForList("SELECT action FROM audit_event", String.class))
			.containsExactly("PASSWORD_RESET_BY_OPERATOR");
		assertThat(jdbc.queryForObject("SELECT row_to_json(a)::text FROM audit_event a", String.class))
			.doesNotContain(temporary, "$2a$", "series-1", "token-1");
		assertThat(output.getAll().lines().filter(line -> line.contains(temporary))).as("never in a log line").hasSize(1);
	}

	@Test
	void withoutATutorItExitsNonZeroAndCreatesNobody() {
		Throwable failure = org.assertj.core.api.Assertions.catchThrowable(this::runCli);

		assertThat(failure).isNotNull();
		assertThat(exitCode(failure)).isEqualTo(2);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM user_account", Integer.class)).isZero();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM audit_event", Integer.class)).isZero();
	}

	/** The exit code Spring Boot uses for a failed run: the first {@link ExitCodeGenerator} in the cause chain. */
	static int exitCode(Throwable failure) {
		for (Throwable t = failure; t != null; t = t.getCause()) {
			if (t instanceof ExitCodeGenerator generator) {
				return generator.getExitCode();
			}
		}
		return 1;
	}

}
