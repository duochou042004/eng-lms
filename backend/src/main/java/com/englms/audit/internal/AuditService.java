package com.englms.audit.internal;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import com.englms.audit.AuditApi;
import com.englms.audit.AuditEntry;
import com.englms.shared.Ids;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Service
class AuditService implements AuditApi {

	/** security.md §8. */
	static final Duration RETENTION = Duration.ofDays(365);

	private final JdbcTemplate jdbc;

	private final JsonMapper json;

	private final Ids ids;

	private final Clock clock;

	AuditService(JdbcTemplate jdbc, JsonMapper json, Ids ids, Clock clock) {
		this.jdbc = jdbc;
		this.json = json;
		this.ids = ids;
		this.clock = clock;
	}

	@Override
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void record(AuditEntry entry) {
		jdbc.update("""
				INSERT INTO audit_event (id, occurred_at, actor_user_id, action, subject_type, subject_id, ip, user_agent, details)
				VALUES (?, ?, ?, ?, ?, ?, CAST(? AS inet), ?, CAST(? AS jsonb))""", ids.newId(),
				Timestamp.from(clock.instant()), entry.actorUserId(), entry.action().name(), entry.subjectType(),
				entry.subjectId(), entry.ip(), entry.userAgent(), json.writeValueAsString(entry.details()));
	}

	/** Deletes the events older than the retention period; returns how many. */
	@Transactional
	public int purgeExpired() {
		Instant cutoff = clock.instant().minus(RETENTION);
		return jdbc.update("DELETE FROM audit_event WHERE occurred_at < ?", Timestamp.from(cutoff));
	}

}
