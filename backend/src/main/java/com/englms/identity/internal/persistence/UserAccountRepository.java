package com.englms.identity.internal.persistence;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.LockModeType;

import com.englms.identity.Role;
import com.englms.identity.internal.domain.AccountStatus;
import com.englms.identity.internal.domain.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {

	/** No lock: sign-in reads the account, checks the password, then locks by ID only to write (SEC review S2-1). */
	Optional<UserAccount> findByUsernameNormalized(String usernameNormalized);

	/** Row-locked: concurrent writes to one account (failure count, lock, password) are serialised. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select a from UserAccount a where a.id = :id")
	Optional<UserAccount> findForUpdateById(UUID id);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select a from UserAccount a where a.role = :role")
	Optional<UserAccount> findForUpdateByRole(Role role);

	boolean existsByRole(Role role);

	boolean existsByUsernameNormalized(String usernameNormalized);

	/** The per-request account check (SEC S4-1): one primary-key read. */
	@Query("select a.status from UserAccount a where a.id = :id")
	Optional<AccountStatus> findStatusById(UUID id);

	/** {@code pattern} is a {@code shared.Like} pattern (escape character {@code \}). */
	@Query("select a.id from UserAccount a where a.role = com.englms.identity.Role.STUDENT"
			+ " and a.usernameNormalized like :pattern escape '\\'")
	Set<UUID> findStudentIdsByUsernameNormalizedLike(String pattern);

}
