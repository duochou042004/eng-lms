package com.englms.identity;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.englms.shared.ProblemCodes;

/**
 * Account commands and lookups for other modules (the students module, T-M2.3). Commands join the caller's
 * transaction. {@link #disable} ends every session and remember-me token of the user at once (FR-AUTH-10, A-018).
 */
public interface AccountApi {

	void disable(UUID userId);

	void enable(UUID userId);

	/**
	 * Creates an {@code ACTIVE} {@code STUDENT} account that must change its password at first sign-in; the temporary
	 * password expires after 7 days if unused (A-021, DEC-097). {@code password} null or empty → a generated one.
	 * @throws com.englms.shared.ProblemException 422 for an invalid username ({@code username}) or a password against
	 * the policy ({@code password}); 409 {@code USERNAME_TAKEN} (also when a concurrent create wins the unique index)
	 */
	TemporaryCredentials createStudentAccount(String username, String password);

	/**
	 * Renames a student account; its sessions stay valid (the principal is the user ID).
	 * @throws com.englms.shared.ProblemException 422 {@code USERNAME_INVALID}; 409 {@code USERNAME_TAKEN}
	 */
	void changeUsername(UUID userId, String username);

	/**
	 * FR-AUTH-07: a new temporary password for a student account (must change, expires after 7 days), the lockout
	 * cleared, every session and remember-me token ended, {@code PasswordReset(TUTOR, tutorUserId)} published.
	 */
	TemporaryCredentials resetPasswordByTutor(UUID userId, UUID tutorUserId);

	UsernameCheck checkUsername(String username);

	/** The password-policy violations of a new password (empty when acceptable). */
	List<ProblemCodes> passwordProblems(String password, String username);

	/** The usernames of the given accounts (unknown IDs are absent): one query. */
	Map<UUID, String> usernames(Collection<UUID> userIds);

	/** The student accounts whose normalised username contains {@code fragment} ({@link Usernames#normalize}d by the caller), literally. */
	Set<UUID> studentUserIdsWithUsernameContaining(String fragment);

	enum UsernameCheck {

		AVAILABLE, INVALID, TAKEN

	}

	/** Shown once; {@link #toString()} never includes the password. */
	record TemporaryCredentials(UUID userId, String username, String temporaryPassword, Instant expiresAt) {

		@Override
		public String toString() {
			return "TemporaryCredentials[userId=" + userId + ", username=" + username + ", expiresAt=" + expiresAt + "]";
		}

	}

}
