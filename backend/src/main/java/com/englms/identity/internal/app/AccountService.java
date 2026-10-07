package com.englms.identity.internal.app;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.englms.identity.AccountApi;
import com.englms.identity.Role;
import com.englms.identity.SessionTerminator;
import com.englms.identity.Usernames;
import com.englms.identity.events.AccountDisabled;
import com.englms.identity.events.PasswordReset;
import com.englms.identity.internal.domain.PasswordPolicy;
import com.englms.identity.internal.domain.TemporaryPasswordGenerator;
import com.englms.identity.internal.domain.UserAccount;
import com.englms.identity.internal.persistence.UserAccountRepository;
import com.englms.shared.Ids;
import com.englms.shared.Like;
import com.englms.shared.ProblemCodes;
import com.englms.shared.ProblemException;
import com.englms.shared.ProblemException.FieldProblem;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Account commands: disable/enable (FR-AUTH-10), the operator's tutor reset (FR-AUTH-09), and the students module's
 * create, rename, tutor reset and lookups (T-M2.3).
 */
@Service
public class AccountService implements AccountApi {

	/** A-021 as extended by DEC-089 (8), confirmed DEC-091. */
	static final Duration TEMPORARY_PASSWORD_VALIDITY = Duration.ofDays(7);

	private final UserAccountRepository accounts;

	private final SessionTerminator sessions;

	private final PasswordEncoder encoder;

	private final TemporaryPasswordGenerator generator;

	private final ApplicationEventPublisher events;

	private final PasswordPolicy policy;

	private final Ids ids;

	private final Clock clock;

	AccountService(UserAccountRepository accounts, SessionTerminator sessions, PasswordEncoder encoder,
			TemporaryPasswordGenerator generator, PasswordPolicy policy, ApplicationEventPublisher events, Ids ids,
			Clock clock) {
		this.accounts = accounts;
		this.sessions = sessions;
		this.encoder = encoder;
		this.generator = generator;
		this.policy = policy;
		this.events = events;
		this.ids = ids;
		this.clock = clock;
	}

	@Override
	@Transactional
	public TemporaryCredentials createStudentAccount(String username, String password) {
		boolean generated = password == null || password.isEmpty();
		String raw = generated ? generator.generate() : PasswordPolicy.normalize(password);
		List<FieldProblem> problems = new ArrayList<>();
		if (!Usernames.isValid(username)) {
			problems.add(usernameInvalid());
		}
		if (!generated) {
			policy.violations(raw, username)
				.forEach(code -> problems.add(new FieldProblem("password", code, AuthenticationService.describe(code))));
		}
		if (!problems.isEmpty()) {
			throw ProblemException.validation(problems);
		}
		if (accounts.existsByUsernameNormalized(Usernames.normalize(username))) {
			throw usernameTaken();
		}
		Instant now = clock.instant();
		Instant expiresAt = now.plus(TEMPORARY_PASSWORD_VALIDITY);
		UserAccount account = UserAccount.newStudent(ids.newId(), username, encoder.encode(raw), expiresAt, now);
		saveCheckingUsername(account);
		return new TemporaryCredentials(account.id(), account.username(), raw, expiresAt);
	}

	@Override
	@Transactional
	public void changeUsername(UUID userId, String username) {
		if (!Usernames.isValid(username)) {
			throw ProblemException.validation(List.of(usernameInvalid()));
		}
		UserAccount account = accounts.findForUpdateById(userId)
			.filter(found -> found.role() == Role.STUDENT)
			.orElseThrow(NoSuchElementException::new);
		String normalized = Usernames.normalize(username);
		if (!normalized.equals(account.usernameNormalized()) && accounts.existsByUsernameNormalized(normalized)) {
			throw usernameTaken();
		}
		account.rename(username, clock.instant());
		saveCheckingUsername(account);
	}

	@Override
	@Transactional
	public TemporaryCredentials resetPasswordByTutor(UUID userId, UUID tutorUserId) {
		// bcrypt before the row lock, so the lock is held only for the write (T-M2.3 G3 SEC-S4-6).
		String temporary = generator.generate();
		String hash = encoder.encode(temporary);
		UserAccount student = accounts.findForUpdateById(userId)
			.filter(account -> account.role() == Role.STUDENT)
			.orElseThrow(NoSuchElementException::new);
		Instant now = clock.instant();
		Instant expiresAt = now.plus(TEMPORARY_PASSWORD_VALIDITY);
		student.resetPassword(hash, expiresAt, now);
		sessions.endAllSessions(userId);
		events.publishEvent(new PasswordReset(userId, PasswordReset.Actor.TUTOR, tutorUserId));
		return new TemporaryCredentials(userId, student.username(), temporary, expiresAt);
	}

	@Override
	@Transactional(readOnly = true)
	public UsernameCheck checkUsername(String username) {
		if (!Usernames.isValid(username)) {
			return UsernameCheck.INVALID;
		}
		return accounts.existsByUsernameNormalized(Usernames.normalize(username)) ? UsernameCheck.TAKEN
				: UsernameCheck.AVAILABLE;
	}

	@Override
	public List<ProblemCodes> passwordProblems(String password, String username) {
		return policy.violations(password, username);
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, String> usernames(Collection<UUID> userIds) {
		if (userIds.isEmpty()) {
			return Map.of();
		}
		return accounts.findAllById(userIds)
			.stream()
			.collect(Collectors.toUnmodifiableMap(UserAccount::id, UserAccount::username));
	}

	@Override
	@Transactional(readOnly = true)
	public Set<UUID> studentUserIdsWithUsernameContaining(String fragment) {
		return accounts.findStudentIdsByUsernameNormalizedLike(Like.contains(fragment));
	}

	/**
	 * Flushes now, so a concurrent create or rename that won {@code ux_user_account__username_normalized} after the
	 * existence check surfaces here as 409 {@code USERNAME_TAKEN} (AC2 race), not as a 500 at commit.
	 */
	private void saveCheckingUsername(UserAccount account) {
		try {
			accounts.saveAndFlush(account);
		}
		catch (DataIntegrityViolationException ex) {
			String cause = String.valueOf(ex.getMostSpecificCause().getMessage());
			if (cause.contains("ux_user_account__username_normalized")) {
				throw usernameTaken();
			}
			throw ex;
		}
	}

	private static FieldProblem usernameInvalid() {
		return new FieldProblem("username", ProblemCodes.USERNAME_INVALID,
				"3-40 characters of a-z, 0-9, '.', '_' or '-'");
	}

	private static ProblemException usernameTaken() {
		return new ProblemException(HttpStatus.CONFLICT, ProblemCodes.USERNAME_TAKEN,
				List.of(new FieldProblem("username", ProblemCodes.USERNAME_TAKEN, "The username is taken")), null);
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
