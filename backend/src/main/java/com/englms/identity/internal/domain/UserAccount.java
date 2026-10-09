package com.englms.identity.internal.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import com.englms.identity.CurrentUser;
import com.englms.identity.Role;
import com.englms.identity.Usernames;

/**
 * An account (data-model.md §2 identity). Enforces the lockout (NFR-SEC-05) and the temporary-password rules
 * (FR-AUTH-06, A-021). The password hash never leaves the identity module and is not part of {@link #toString()}.
 */
@Entity
@Table(name = "user_account")
public class UserAccount {

	@Id
	private UUID id;

	private String username;

	private String usernameNormalized;

	private String passwordHash;

	@Enumerated(EnumType.STRING)
	private Role role;

	@Enumerated(EnumType.STRING)
	private AccountStatus status;

	private boolean mustChangePassword;

	private Instant tempPasswordExpiresAt;

	private int failedLoginCount;

	private Instant lockedUntil;

	private Instant lastLoginAt;

	private String locale;

	private String timeZone;

	private String displayName;

	/** Incremented by a reset by someone else (DEC-100 S4-5); see {@link CurrentUser#credentialStamp()}. */
	private long credentialStamp;

	@Column(updatable = false)
	private Instant createdAt;

	private Instant updatedAt;

	@Version
	private long version;

	protected UserAccount() {
	}

	/** A new account whose password must be changed at first sign-in (FR-AUTH-02, FR-AUTH-06). */
	public UserAccount(UUID id, String username, String passwordHash, Role role, Instant now) {
		this.id = id;
		this.username = username.strip();
		this.usernameNormalized = Usernames.normalize(username);
		this.passwordHash = passwordHash;
		this.role = role;
		this.status = AccountStatus.ACTIVE;
		this.mustChangePassword = true;
		this.locale = "vi";
		this.timeZone = "Asia/Ho_Chi_Minh";
		this.createdAt = now;
		this.updatedAt = now;
	}

	/** A student account created by the tutor (FR-STU-01): its temporary password expires like a reset one (A-021, DEC-097). */
	public static UserAccount newStudent(UUID id, String username, String temporaryHash, Instant expiresAt, Instant now) {
		UserAccount account = new UserAccount(id, username, temporaryHash, Role.STUDENT, now);
		account.tempPasswordExpiresAt = expiresAt;
		return account;
	}

	/** FR-STU-03: a new username; the principal is the user ID, so sessions stay valid. */
	public void rename(String newUsername, Instant now) {
		username = newUsername.strip();
		usernameNormalized = Usernames.normalize(newUsername);
		updatedAt = now;
	}

	public String usernameNormalized() {
		return usernameNormalized;
	}

	public AccountStatus status() {
		return status;
	}

	public boolean isLocked(Instant now) {
		return lockedUntil != null && lockedUntil.isAfter(now);
	}

	public boolean isActive() {
		return status == AccountStatus.ACTIVE;
	}

	public boolean isTemporaryPasswordExpired(Instant now) {
		return mustChangePassword && tempPasswordExpiresAt != null && !tempPasswordExpiresAt.isAfter(now);
	}

	/**
	 * Counts one failed attempt. At {@code maxFailures} consecutive failures the account locks for
	 * {@code lockDuration} and the count starts again, so the lock is reported once.
	 * @return whether this failure locked the account
	 */
	public boolean recordFailure(int maxFailures, Duration lockDuration, Instant now) {
		failedLoginCount++;
		updatedAt = now;
		if (failedLoginCount < maxFailures) {
			return false;
		}
		failedLoginCount = 0;
		lockedUntil = now.plus(lockDuration);
		return true;
	}

	public void recordSuccessfulLogin(Instant now) {
		failedLoginCount = 0;
		lockedUntil = null;
		lastLoginAt = now;
		updatedAt = now;
	}

	/** The user's own change (FR-AUTH-05): ends the must-change state. */
	public void changePassword(String newHash, Instant now) {
		passwordHash = newHash;
		mustChangePassword = false;
		tempPasswordExpiresAt = null;
		failedLoginCount = 0;
		updatedAt = now;
	}

	/**
	 * A reset to a temporary password by someone else (FR-AUTH-07 tutor, FR-AUTH-09 operator): must change, expires,
	 * clears the lockout, and increments the credential stamp, so a session stored by a login racing the reset is
	 * refused on its next request (DEC-100 S4-5).
	 */
	public void resetPassword(String temporaryHash, Instant expiresAt, Instant now) {
		credentialStamp++;
		passwordHash = temporaryHash;
		mustChangePassword = true;
		tempPasswordExpiresAt = expiresAt;
		failedLoginCount = 0;
		lockedUntil = null;
		updatedAt = now;
	}

	public void disable(Instant now) {
		status = AccountStatus.DISABLED;
		updatedAt = now;
	}

	public void enable(Instant now) {
		status = AccountStatus.ACTIVE;
		updatedAt = now;
	}

	public CurrentUser toCurrentUser() {
		return new CurrentUser(id, role, mustChangePassword, credentialStamp);
	}

	public UUID id() {
		return id;
	}

	public String username() {
		return username;
	}

	public String passwordHash() {
		return passwordHash;
	}

	public Role role() {
		return role;
	}

	public boolean mustChangePassword() {
		return mustChangePassword;
	}

	public Instant tempPasswordExpiresAt() {
		return tempPasswordExpiresAt;
	}

	public int failedLoginCount() {
		return failedLoginCount;
	}

	public Instant lockedUntil() {
		return lockedUntil;
	}

	public Instant lastLoginAt() {
		return lastLoginAt;
	}

	public String locale() {
		return locale;
	}

	public String timeZone() {
		return timeZone;
	}

	public String displayName() {
		return displayName;
	}

	public long credentialStamp() {
		return credentialStamp;
	}

	@Override
	public String toString() {
		return "UserAccount[id=" + id + ", role=" + role + ", status=" + status + "]";
	}

}
