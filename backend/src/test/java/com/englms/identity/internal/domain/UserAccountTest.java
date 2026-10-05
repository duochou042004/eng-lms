package com.englms.identity.internal.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.englms.identity.Role;

/** Lockout transitions (NFR-SEC-05) and the temporary-password rules (A-021) with fixed instants. */
class UserAccountTest {

	static final Instant T0 = Instant.parse("2026-10-04T10:00:00Z");

	static final Duration LOCK = Duration.ofMinutes(15);

	UserAccount account() {
		UserAccount account = new UserAccount(UUID.randomUUID(), " Tutor.One ", "{bcrypt}x", Role.TUTOR, T0);
		account.changePassword("{bcrypt}y", T0);
		return account;
	}

	@Test
	void locksAtTheTenthConsecutiveFailureForFifteenMinutes() {
		UserAccount account = account();
		for (int i = 1; i < 10; i++) {
			assertThat(account.recordFailure(10, LOCK, T0)).isFalse();
			assertThat(account.isLocked(T0)).isFalse();
		}
		assertThat(account.recordFailure(10, LOCK, T0)).isTrue();
		assertThat(account.lockedUntil()).isEqualTo(T0.plus(LOCK));
		assertThat(account.isLocked(T0.plus(LOCK).minusMillis(1))).isTrue();
		assertThat(account.isLocked(T0.plus(LOCK))).as("expired exactly at lockedUntil").isFalse();
		assertThat(account.failedLoginCount()).as("counting restarts, so the lock is reported once").isZero();
	}

	@Test
	void aSuccessfulLoginResetsTheCountAndTheLock() {
		UserAccount account = account();
		account.recordFailure(10, LOCK, T0);
		account.recordFailure(10, LOCK, T0);

		account.recordSuccessfulLogin(T0.plusSeconds(1));

		assertThat(account.failedLoginCount()).isZero();
		assertThat(account.lockedUntil()).isNull();
		assertThat(account.lastLoginAt()).isEqualTo(T0.plusSeconds(1));
	}

	@Test
	void aResetSetsMustChangeWithAnExpiryAndClearsTheLockout() {
		UserAccount account = account();
		for (int i = 0; i < 10; i++) {
			account.recordFailure(10, LOCK, T0);
		}

		account.resetPassword("{bcrypt}temp", T0.plus(Duration.ofDays(7)), T0);

		assertThat(account.isLocked(T0)).isFalse();
		assertThat(account.mustChangePassword()).isTrue();
		assertThat(account.isTemporaryPasswordExpired(T0.plus(Duration.ofDays(7)).minusSeconds(1))).isFalse();
		assertThat(account.isTemporaryPasswordExpired(T0.plus(Duration.ofDays(7)))).isTrue();
		account.changePassword("{bcrypt}mine", T0);
		assertThat(account.mustChangePassword()).isFalse();
		assertThat(account.tempPasswordExpiresAt()).isNull();
	}

	@Test
	void keepsTheTrimmedUsernameAndNormalisesIt() {
		assertThat(account().username()).isEqualTo("Tutor.One");
		assertThat(account().toString()).doesNotContain("bcrypt");
	}

}
