package com.englms.identity.internal.app;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.NoSuchElementException;
import java.util.UUID;

import com.englms.identity.AccountApi;
import com.englms.identity.Role;
import com.englms.identity.SessionTerminator;
import com.englms.identity.events.AccountDisabled;
import com.englms.identity.events.PasswordReset;
import com.englms.identity.internal.domain.TemporaryPasswordGenerator;
import com.englms.identity.internal.domain.UserAccount;
import com.englms.identity.internal.persistence.UserAccountRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Account commands: disable/enable (FR-AUTH-10) and the operator's tutor reset (FR-AUTH-09). */
@Service
public class AccountService implements AccountApi {

	/** A-021 as extended by DEC-089 (8), confirmed DEC-091. */
	static final Duration TEMPORARY_PASSWORD_VALIDITY = Duration.ofDays(7);

	private final UserAccountRepository accounts;

	private final SessionTerminator sessions;

	private final PasswordEncoder encoder;

	private final TemporaryPasswordGenerator generator;

	private final ApplicationEventPublisher events;

	private final Clock clock;

	AccountService(UserAccountRepository accounts, SessionTerminator sessions, PasswordEncoder encoder,
			TemporaryPasswordGenerator generator, ApplicationEventPublisher events, Clock clock) {
		this.accounts = accounts;
		this.sessions = sessions;
		this.encoder = encoder;
		this.generator = generator;
		this.events = events;
		this.clock = clock;
	}

	@Override
	@Transactional
	public void disable(UUID userId) {
		UserAccount account = accounts.findForUpdateById(userId).orElseThrow(NoSuchElementException::new);
		account.disable(clock.instant());
		sessions.endAllSessions(userId);
		events.publishEvent(new AccountDisabled(userId));
	}

	@Override
	@Transactional
	public void enable(UUID userId) {
		accounts.findForUpdateById(userId).orElseThrow(NoSuchElementException::new).enable(clock.instant());
	}

	/**
	 * Runbooks §4: a temporary password for the tutor (must be changed, expires after 7 days), the lockout cleared,
	 * every session and remember-me token ended, an audit event. Never creates an account.
	 * @return the tutor's username and the temporary password, shown once
	 * @throws NoTutorException when the database has no tutor
	 */
	@Transactional
	public OperatorReset resetTutorPasswordByOperator() {
		UserAccount tutor = accounts.findForUpdateByRole(Role.TUTOR).orElseThrow(NoTutorException::new);
		Instant now = clock.instant();
		String temporary = generator.generate();
		Instant expiresAt = now.plus(TEMPORARY_PASSWORD_VALIDITY);
		tutor.resetPassword(encoder.encode(temporary), expiresAt, now);
		sessions.endAllSessions(tutor.id());
		events.publishEvent(new PasswordReset(tutor.id(), PasswordReset.Actor.OPERATOR, null));
		return new OperatorReset(tutor.username(), temporary, expiresAt);
	}

	public record OperatorReset(String username, String temporaryPassword, Instant expiresAt) {

		@Override
		public String toString() {
			return "OperatorReset[username=" + username + ", expiresAt=" + expiresAt + "]";
		}

	}

	public static final class NoTutorException extends IllegalStateException {

		NoTutorException() {
			super("The database has no tutor account; the reset never creates one (runbooks §4)");
		}

	}

}
