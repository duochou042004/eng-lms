package com.englms.identity.internal.app;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.englms.identity.SessionTerminator;
import com.englms.identity.Usernames;
import com.englms.identity.events.AccountLocked;
import com.englms.identity.events.ClientInfo;
import com.englms.identity.events.LoginFailed;
import com.englms.identity.events.LoginSucceeded;
import com.englms.identity.events.PasswordChanged;
import com.englms.identity.internal.domain.PasswordPolicy;
import com.englms.identity.internal.domain.UserAccount;
import com.englms.identity.internal.persistence.UserAccountRepository;
import com.englms.identity.internal.security.IdentityProperties;
import com.englms.identity.internal.security.LoginThrottle;
import com.englms.shared.ProblemCodes;
import com.englms.shared.ProblemException;
import com.englms.shared.ProblemException.FieldProblem;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Sign-in (FR-AUTH-03, NFR-SEC-05, T16) and the own-password change (FR-AUTH-05, FR-AUTH-06).
 * <p>
 * bcrypt (~0.3 s) never runs while a row lock, a transaction or a pool connection is held (SEC review S2-1): the account
 * is read without a lock, the password is checked, and only then a short {@code REQUIRES_NEW} transaction locks the
 * row, re-checks status, lock, expiry and the hash against the current state, and writes the outcome. The events are
 * published after that commit; the audit module writes them in its own transaction. So a failed attempt is counted
 * and audited although the request ends in a 401 or 422, the answer time doesn't depend on concurrent attempts on the
 * same account (no username oracle), and a burst on one account doesn't hold connections other sign-ins need.
 */
@Service
public class AuthenticationService {

	/** Inputs longer than these are never looked up or hashed (SEC review S2-2); no account can match them, and the login still pays one dummy bcrypt. */
	static final int MAX_USERNAME_INPUT = 64;

	static final int MAX_PASSWORD_INPUT = 1024;

	static final String REJECTED_INPUT_PROBE = "rejected-input";

	private final UserAccountRepository accounts;

	private final PasswordEncoder encoder;

	private final PasswordPolicy policy;

	private final LoginThrottle throttle;

	private final SessionTerminator sessions;

	private final IdentityProperties properties;

	private final ApplicationEventPublisher events;

	private final TransactionTemplate transactions;

	private final Clock clock;

	/** A bcrypt hash of a random value: an unknown username costs one {@code matches} like a known one (T16). */
	private final String dummyHash;

	AuthenticationService(UserAccountRepository accounts, PasswordEncoder encoder, PasswordPolicy policy,
			LoginThrottle throttle, SessionTerminator sessions, IdentityProperties properties,
			ApplicationEventPublisher events, PlatformTransactionManager transactionManager, Clock clock) {
		this.accounts = accounts;
		this.encoder = encoder;
		this.policy = policy;
		this.throttle = throttle;
		this.sessions = sessions;
		this.properties = properties;
		this.events = events;
		this.transactions = new TransactionTemplate(transactionManager);
		this.transactions.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
		this.clock = clock;
		this.dummyHash = encoder.encode(UUID.randomUUID().toString());
	}

	/**
	 * @return the signed-in account
	 * @throws ProblemException 429 {@code RATE_LIMITED} past the per-IP throttle; otherwise one generic 401
	 * {@code UNAUTHENTICATED} for every failure (unknown user, wrong password, locked, disabled, expired temporary
	 * password, over-long input), so the answer never reveals whether an account exists (T16, DEC-089 (6))
	 */
	public AccountView login(String username, String password, ClientInfo client) {
		throttle.tryAcquire(client.ip()).ifPresent(wait -> {
			throw new ProblemException(HttpStatus.TOO_MANY_REQUESTS, ProblemCodes.RATE_LIMITED, List.of(), wait);
		});
		List<Object> published = new ArrayList<>();
		AccountView view = attempt(username, password, client, published);
		published.forEach(events::publishEvent);
		if (view == null) {
			throw new ProblemException(HttpStatus.UNAUTHORIZED, ProblemCodes.UNAUTHENTICATED);
		}
		return view;
	}

	private AccountView attempt(String username, String password, ClientInfo client, List<Object> published) {
		// A control character (e.g. NUL, which PostgreSQL refuses) can never be part of a username (T-M2.3 SEC R2-1).
		if (username == null || password == null || username.length() > MAX_USERNAME_INPUT
				|| password.length() > MAX_PASSWORD_INPUT || username.chars().anyMatch(Character::isISOControl)) {
			// non-empty: the encoder short-circuits an empty password, so this pays one full bcrypt like any other failure (SEC S4-10)
			encoder.matches(REJECTED_INPUT_PROBE, dummyHash);
			published.add(new LoginFailed(null, LoginFailed.Reason.REJECTED_INPUT, client));
			return null;
		}
		String raw = PasswordPolicy.normalize(password);
		Optional<UserAccount> found = accounts.findByUsernameNormalized(Usernames.normalize(username));
		if (found.isEmpty()) {
			encoder.matches(raw, dummyHash);
			published.add(new LoginFailed(null, LoginFailed.Reason.UNKNOWN_USERNAME, client));
			return null;
		}
		UUID id = found.get().id();
		String checkedHash = found.get().passwordHash();
		boolean matches = encoder.matches(raw, checkedHash);
		return transactions.execute(status -> {
			Instant now = clock.instant();
			UserAccount account = accounts.findForUpdateById(id).orElse(null);
			LoginFailed.Reason failure = null;
			if (account == null) {
				failure = LoginFailed.Reason.UNKNOWN_USERNAME;
			}
			else if (!account.isActive()) {
				failure = LoginFailed.Reason.ACCOUNT_DISABLED;
			}
			else if (account.isLocked(now)) {
				failure = LoginFailed.Reason.ACCOUNT_LOCKED;
			}
			else if (!account.passwordHash().equals(checkedHash)) {
				// The password changed while this attempt was being checked: the attempt proved nothing.
				failure = LoginFailed.Reason.BAD_PASSWORD;
			}
			else if (!matches) {
				failure = LoginFailed.Reason.BAD_PASSWORD;
				if (account.recordFailure(properties.lockout().maxFailures(), properties.lockout().duration(), now)) {
					published.add(new AccountLocked(account.id(), account.lockedUntil(), client));
				}
			}
			else if (account.isTemporaryPasswordExpired(now)) {
				failure = LoginFailed.Reason.TEMPORARY_PASSWORD_EXPIRED;
			}
			if (failure != null) {
				published.addFirst(new LoginFailed(id, failure, client));
				return null;
			}
			account.recordSuccessfulLogin(now);
			published.add(new LoginSucceeded(account.id(), client));
			return AccountView.of(account);
		});
	}

	/**
	 * Changes the signed-in user's password. A wrong current password (or an expired temporary one) counts toward the
	 * lockout; reaching the lock that way ends all of the user's sessions and remember-me tokens (AC7). On success every
	 * other session and every remember-me token of the user ends; {@code keepSessionId} (the caller's session) stays.
	 * @return the updated account
	 * @throws ProblemException 401 when the account is gone; 422 {@code VALIDATION_FAILED} with field codes
	 */
	public AccountView changePassword(UUID userId, String currentPassword, String newPassword, ClientInfo client,
			String keepSessionId) {
		UserAccount snapshot = accounts.findById(userId).filter(UserAccount::isActive).orElse(null);
		if (snapshot == null) {
			throw new ProblemException(HttpStatus.UNAUTHORIZED, ProblemCodes.UNAUTHENTICATED);
		}
		String checkedHash = snapshot.passwordHash();
		String current = (currentPassword != null) ? currentPassword : "";
		boolean currentOk = current.length() <= MAX_PASSWORD_INPUT
				&& encoder.matches(PasswordPolicy.normalize(current), checkedHash)
				&& !snapshot.isTemporaryPasswordExpired(clock.instant());
		List<FieldProblem> problems = new ArrayList<>();
		String newHash = null;
		if (currentOk) {
			String replacement = PasswordPolicy.normalize((newPassword != null) ? newPassword : "");
			policy.violations(replacement, snapshot.username())
				.forEach(code -> problems.add(new FieldProblem("newPassword", code, describe(code))));
			if (problems.isEmpty() && encoder.matches(replacement, checkedHash)) {
				problems.add(new FieldProblem("newPassword", ProblemCodes.PASSWORD_UNCHANGED,
						describe(ProblemCodes.PASSWORD_UNCHANGED)));
			}
			if (problems.isEmpty()) {
				newHash = encoder.encode(replacement);
			}
		}
		String hashToStore = newHash;
		List<Object> published = new ArrayList<>();
		ChangeOutcome outcome = transactions.execute(status -> {
			Instant now = clock.instant();
			UserAccount account = accounts.findForUpdateById(userId).orElse(null);
			if (account == null || !account.isActive()) {
				return new ChangeOutcome(null, List.of(), false, true);
			}
			if (!currentOk || !account.passwordHash().equals(checkedHash)) {
				published.add(new LoginFailed(userId, LoginFailed.Reason.CURRENT_PASSWORD_INCORRECT, client));
				boolean locked = account.recordFailure(properties.lockout().maxFailures(),
						properties.lockout().duration(), now);
				if (locked) {
					published.add(new AccountLocked(userId, account.lockedUntil(), client));
					sessions.endAllSessions(userId);
				}
				return new ChangeOutcome(null, List.of(new FieldProblem("currentPassword",
						ProblemCodes.CURRENT_PASSWORD_INCORRECT, "The current password is incorrect")), locked, false);
			}
			if (!problems.isEmpty()) {
				return new ChangeOutcome(null, problems, false, false);
			}
			account.changePassword(hashToStore, now);
			sessions.endOtherSessions(userId, keepSessionId);
			published.add(new PasswordChanged(userId, client));
			return new ChangeOutcome(AccountView.of(account), List.of(), false, false);
		});
		published.forEach(events::publishEvent);
		if (outcome.gone()) {
			throw new ProblemException(HttpStatus.UNAUTHORIZED, ProblemCodes.UNAUTHENTICATED);
		}
		if (!outcome.problems().isEmpty()) {
			throw new PasswordChangeRejected(outcome.problems(), outcome.locked());
		}
		return outcome.view();
	}

	@Transactional(readOnly = true)
	public Optional<AccountView> view(UUID userId) {
		return accounts.findById(userId).filter(UserAccount::isActive).map(AccountView::of);
	}

	static String describe(ProblemCodes code) {
		return switch (code) {
			case PASSWORD_TOO_SHORT -> "At least " + PasswordPolicy.MIN_LENGTH + " characters";
			case PASSWORD_TOO_LONG -> "At most " + PasswordPolicy.MAX_LENGTH + " characters";
			case PASSWORD_TOO_COMMON -> "Too common";
			case PASSWORD_EQUALS_USERNAME -> "Must differ from the username";
			case PASSWORD_UNCHANGED -> "Must differ from the current password";
			default -> code.name();
		};
	}

	private record ChangeOutcome(AccountView view, List<FieldProblem> problems, boolean locked, boolean gone) {
	}

	/** 422 {@code VALIDATION_FAILED}; {@link #sessionsEnded()} when the wrong current password locked the account. */
	public static final class PasswordChangeRejected extends ProblemException {

		private final boolean sessionsEnded;

		PasswordChangeRejected(List<FieldProblem> errors, boolean sessionsEnded) {
			super(HttpStatus.UNPROCESSABLE_CONTENT, ProblemCodes.VALIDATION_FAILED, errors, null);
			this.sessionsEnded = sessionsEnded;
		}

		public boolean sessionsEnded() {
			return sessionsEnded;
		}

	}

}
