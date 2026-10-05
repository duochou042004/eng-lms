package com.englms.audit.internal;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import com.englms.TestcontainersConfiguration;
import com.englms.identity.events.ClientInfo;
import com.englms.identity.events.LoginFailed;
import com.englms.identity.events.PasswordReset;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.config.CronTask;
import org.springframework.scheduling.config.ScheduledTaskHolder;
import org.springframework.transaction.support.TransactionTemplate;

/** T-M2.1 AC11 and the audit design notes: own-transaction writes and the 365-day retention, with a fixed clock. */
@Tag("container")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import({ TestcontainersConfiguration.class, AuditIntegrationTest.FixedClock.class })
class AuditIntegrationTest {

	static final Instant NOW = Instant.parse("2027-03-01T03:30:00Z");

	@TestConfiguration(proxyBeanMethods = false)
	static class FixedClock {

		@Bean
		@Primary
		Clock fixedClock() {
			return Clock.fixed(NOW, ZoneOffset.UTC);
		}

	}

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	AuditService audit;

	@Autowired
	ApplicationEventPublisher events;

	@Autowired
	TransactionTemplate transactions;

	@Autowired
	ScheduledTaskHolder scheduledTasks;

	@BeforeEach
	void clean() {
		jdbc.update("DELETE FROM audit_event");
	}

	void insertAt(Instant occurredAt) {
		jdbc.update("INSERT INTO audit_event (id, occurred_at, action) VALUES (?, ?, 'LOGIN_FAILED')", UUID.randomUUID(),
				Timestamp.from(occurredAt));
	}

	@Test
	void thePurgeDeletesEventsOlderThan365DaysOnly() {
		insertAt(NOW.minus(Duration.ofDays(400)));
		insertAt(NOW.minus(Duration.ofDays(365)).minusSeconds(1));
		insertAt(NOW.minus(Duration.ofDays(365)));
		insertAt(NOW.minus(Duration.ofDays(1)));

		assertThat(audit.purgeExpired()).isEqualTo(2);
		assertThat(jdbc.queryForList("SELECT occurred_at FROM audit_event ORDER BY occurred_at", Timestamp.class))
			.extracting(Timestamp::toInstant)
			.containsExactly(NOW.minus(Duration.ofDays(365)), NOW.minus(Duration.ofDays(1)));
	}

	@Test
	void thePurgeIsScheduledDaily() {
		assertThat(scheduledTasks.getScheduledTasks()).extracting(task -> task.getTask())
			.filteredOn(CronTask.class::isInstance)
			.map(task -> ((CronTask) task).getExpression())
			.contains("0 30 3 * * *");
	}

	@Test
	void aFailedLoginRowSurvivesWhenTheSurroundingTransactionRollsBack() {
		UUID user = UUID.randomUUID();
		transactions.executeWithoutResult(status -> {
			events.publishEvent(new LoginFailed(user, LoginFailed.Reason.BAD_PASSWORD, new ClientInfo("10.0.0.7", "UA")));
			status.setRollbackOnly();
		});

		assertThat(jdbc.queryForMap("SELECT action, subject_id, host(ip) AS ip, user_agent, details->>'reason' AS reason, occurred_at FROM audit_event"))
			.containsEntry("action", "LOGIN_FAILED")
			.containsEntry("subject_id", user)
			.containsEntry("ip", "10.0.0.7")
			.containsEntry("user_agent", "UA")
			.containsEntry("reason", "BAD_PASSWORD")
			.containsEntry("occurred_at", Timestamp.from(NOW));
	}

	@Test
	void passwordResetsAreRecordedByActor() {
		UUID tutor = UUID.randomUUID();
		UUID student = UUID.randomUUID();
		events.publishEvent(new PasswordReset(tutor, PasswordReset.Actor.OPERATOR, null));
		events.publishEvent(new PasswordReset(student, PasswordReset.Actor.TUTOR, tutor));

		assertThat(jdbc.queryForList("SELECT action || ':' || coalesce(actor_user_id::text, '-') FROM audit_event ORDER BY action",
				String.class))
			.containsExactly("PASSWORD_RESET_BY_OPERATOR:-", "PASSWORD_RESET_BY_TUTOR:" + tutor);
	}

}
