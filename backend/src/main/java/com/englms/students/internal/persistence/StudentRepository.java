package com.englms.students.internal.persistence;

import java.util.Optional;
import java.util.UUID;

import jakarta.persistence.LockModeType;

import com.englms.students.internal.domain.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface StudentRepository extends JpaRepository<Student, UUID>, JpaSpecificationExecutor<Student> {

	@Query("select s.id from Student s where s.userId = :userId")
	Optional<UUID> findIdByUserId(UUID userId);

	/** {@code SELECT … FOR UPDATE}: serialises appends of guardians to one student (DEC-103). */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select s from Student s where s.id = :id")
	Optional<Student> findForUpdateById(UUID id);

}
