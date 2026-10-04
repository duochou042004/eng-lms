package com.englms.identity;

import static com.englms.identity.IdentityFixtures.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;

import com.englms.EnglmsApplication;
import com.englms.TestcontainersConfiguration;
import org.flywaydb.core.Flyway;

import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Whole-application starts against one PostgreSQL container: the tutor bootstrap (T-M2.1 AC1), sessions that survive
 * a restart (AC2) and the Secure-cookie guard (AC2, NFR-SEC-04). Each scenario starts and closes its own application.
 */
@Tag("container")
@ExtendWith(OutputCaptureExtension.class)
class StartupScenariosTest {

	static PostgreSQLContainer postgres;

	static JdbcTemplate jdbc;

	final List<ConfigurableApplicationContext> started = new ArrayList<>();

	@TempDir
	Path dir;

	@BeforeAll
	static void startDatabase() {
		postgres = TestcontainersConfiguration.newPostgres();
		postgres.start();
		jdbc = new JdbcTemplate(new DriverManagerDataSource(postgres.getJdbcUrl() + "&currentSchema=app",
				postgres.getUsername(), postgres.getPassword()));
		Flyway.configure()
			.dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
			.schemas("app")
			.defaultSchema("app")
			.load()
			.migrate();
	}

	@AfterAll
	static void stopDatabase() {
		postgres.stop();
	}

	@BeforeEach
	void clean() {
		IdentityFixtures.reset(jdbc);
	}

	@AfterEach
	void closeAll() {
		started.forEach(ConfigurableApplicationContext::close);
	}

	ConfigurableApplicationContext start(WebApplicationType type, Map<String, Object> properties) {
		Map<String, Object> all = new java.util.HashMap<>(Map.of("spring.datasource.url", postgres.getJdbcUrl(),
				"spring.datasource.username", postgres.getUsername(), "spring.datasource.password",
				postgres.getPassword(), "server.port", 0, "management.server.port", 0));
		all.putAll(properties);
		// Command-line arguments: they override application.properties (builder "properties" are only defaults).
		ConfigurableApplicationContext context = new SpringApplicationBuilder(EnglmsApplication.class).web(type)
			.run(all.entrySet().stream().map(e -> "--" + e.getKey() + "=" + e.getValue()).toArray(String[]::new));
		started.add(context);
		return context;
	}

	static void close(ConfigurableApplicationContext context) {
		context.close();
	}

	Path passwordFile(String content) throws IOException {
		return Files.writeString(dir.resolve("tutor-password"), content);
	}

	Map<String, Object> bootstrap(String username, Path file) {
		return Map.of("englms.bootstrap.tutor.username", username, "englms.bootstrap.tutor.password-file", file.toString());
	}

	int tutors() {
		return jdbc.queryForObject("SELECT count(*) FROM user_account WHERE role = 'TUTOR'", Integer.class);
	}

	// ---- AC1 -------------------------------------------------------------------------------------------------

	@Test
	void anEmptyDatabaseGetsOneTutorFromTheSecretFile() throws IOException {
		close(start(WebApplicationType.NONE, bootstrap("Co.Lan", passwordFile("first-start-secret\n"))));

		assertThat(tutors()).isOne();
		Map<String, Object> tutor = jdbc.queryForMap("SELECT * FROM user_account WHERE role = 'TUTOR'");
		assertThat(tutor).containsEntry("username", "Co.Lan").containsEntry("username_normalized", "co.lan")
			.containsEntry("must_change_password", true).containsEntry("status", "ACTIVE");
		assertThat(tutor.get("temp_password_expires_at")).isNull();
		String hash = (String) tutor.get("password_hash");
		assertThat(hash).startsWith("{bcrypt}$2a$12$");
		assertThat(PasswordEncoderFactories.createDelegatingPasswordEncoder().matches("first-start-secret", hash)).isTrue();
		assertThat(jdbc.queryForList("SELECT details::text FROM audit_event WHERE action = 'BOOTSTRAP_TUTOR_CREATED'",
				String.class)).containsExactly("{}");
	}

	@Test
	void anExistingTutorMakesTheVariablesIgnoredWithOneInfoLine(CapturedOutput output) throws IOException {
		IdentityFixtures.insert(jdbc, "tutor.one", PASSWORD, Role.TUTOR, false);

		close(start(WebApplicationType.NONE, bootstrap("another.tutor", dir.resolve("missing-file"))));

		assertThat(tutors()).isOne();
		assertThat(output.getOut().lines().filter(line -> line.contains("the tutor bootstrap variables are ignored")))
			.singleElement()
			.asString()
			.contains("\"level\":\"INFO\"");
	}

	@Test
	void aMissingPasswordFileStopsStartup() {
		assertThatThrownBy(() -> start(WebApplicationType.NONE, bootstrap("co.lan", dir.resolve("missing-file"))))
			.hasMessageContaining("password file is missing or unreadable");
		assertThat(jdbc.queryForObject("SELECT count(*) FROM user_account", Integer.class)).isZero();
	}

	@Test
	void aPasswordFailingThePolicyStopsStartupWithoutPrintingIt(CapturedOutput output) throws IOException {
		Path file = passwordFile("Sh0rtPw!");

		assertThatThrownBy(() -> start(WebApplicationType.NONE, bootstrap("co.lan", file)))
			.hasMessageContaining("PASSWORD_TOO_SHORT")
			.message()
			.doesNotContain("Sh0rtPw!");
		assertThat(output.getAll()).doesNotContain("Sh0rtPw!");
		assertThat(tutors()).isZero();
	}

	@Test
	void onlyOneOfTheTwoVariablesStopsStartup() throws IOException {
		Path file = passwordFile("first-start-secret");

		assertThatThrownBy(() -> start(WebApplicationType.NONE,
				Map.of("englms.bootstrap.tutor.password-file", file.toString())))
			.hasMessageContaining("needs both");
	}

	@Test
	void anEmptyDatabaseWithoutVariablesStartsWithAWarning(CapturedOutput output) {
		close(start(WebApplicationType.NONE, Map.of()));

		assertThat(tutors()).isZero();
		assertThat(output.getOut()).contains("nobody can sign in until they are set");
	}

	// ---- AC2 -------------------------------------------------------------------------------------------------

	@Test
	void aSessionSurvivesAnApplicationRestart() {
		IdentityFixtures.insert(jdbc, "tutor.one", PASSWORD, Role.TUTOR, false);
		ConfigurableApplicationContext first = start(WebApplicationType.SERVLET, Map.of());
		Browser browser = new Browser(port(first));
		assertThat(browser.login("tutor.one", PASSWORD, false).status()).isEqualTo(200);
		Map<String, String> cookies = Map.copyOf(browser.cookies);
		close(first);

		ConfigurableApplicationContext second = start(WebApplicationType.SERVLET, Map.of());
		Browser again = new Browser(port(second));
		again.cookies.putAll(cookies);

		assertThat(again.get("/api/v1/auth/session").status()).isEqualTo(200);
		close(second);
	}

	@Test
	void insecureCookiesAreRefusedWithoutTheLocalProfile() {
		assertThatThrownBy(() -> start(WebApplicationType.SERVLET, Map.of("server.servlet.session.cookie.secure", false)))
			.rootCause()
			.hasMessageContaining("only allowed with the 'local' Spring profile");
	}

	@Test
	void insecureCookiesAreAllowedUnderTheLocalProfile() {
		ConfigurableApplicationContext context = start(WebApplicationType.SERVLET,
				Map.of("server.servlet.session.cookie.secure", false, "spring.profiles.active", "local"));
		IdentityFixtures.insert(jdbc, "tutor.one", PASSWORD, Role.TUTOR, false);

		Browser.Response response = new Browser(port(context)).login("tutor.one", PASSWORD, true);

		assertThat(response.setCookie(Browser.SESSION)).doesNotContain("Secure");
		assertThat(response.setCookie(Browser.REMEMBER_ME)).doesNotContain("Secure");
		close(context);
	}

	static int port(ConfigurableApplicationContext context) {
		return ((WebServerApplicationContext) context).getWebServer().getPort();
	}

}
