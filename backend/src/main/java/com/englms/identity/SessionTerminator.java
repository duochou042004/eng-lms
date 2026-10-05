package com.englms.identity;

import java.util.UUID;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.jdbc.JdbcIndexedSessionRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Ends a user's server-side sessions (Spring Session's principal-name index) and deletes their remember-me tokens
 * ({@code persistent_logins}), so neither a session cookie nor a remember-me cookie revives the account (A-018,
 * ADR-0005). Works in the web application (Boot's session repository) and in the operator CLI, which has no web
 * context (a repository on the same tables).
 */
@Component
public class SessionTerminator {

	private final FindByIndexNameSessionRepository<?> sessions;

	private final JdbcTemplate jdbc;

	SessionTerminator(ObjectProvider<FindByIndexNameSessionRepository<?>> sessions, JdbcTemplate jdbc,
			TransactionTemplate transactions) {
		this.sessions = sessions.getIfAvailable(() -> new JdbcIndexedSessionRepository(jdbc, transactions));
		this.jdbc = jdbc;
	}

	public void endAllSessions(UUID userId) {
		endOtherSessions(userId, null);
	}

	/** Ends every session of the user except {@code keepSessionId} (may be null), and every remember-me token. */
	public void endOtherSessions(UUID userId, String keepSessionId) {
		sessions.findByPrincipalName(userId.toString())
			.keySet()
			.stream()
			.filter(id -> !id.equals(keepSessionId))
			.forEach(sessions::deleteById);
		jdbc.update("DELETE FROM persistent_logins WHERE username = ?", userId.toString());
	}

}
