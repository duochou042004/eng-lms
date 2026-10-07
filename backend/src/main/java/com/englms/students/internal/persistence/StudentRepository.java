package com.englms.students.internal.persistence;

import java.util.Optional;
import java.util.UUID;

import com.englms.students.internal.domain.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface StudentRepository extends JpaRepository<Student, UUID>, JpaSpecificationExecutor<Student> {

	@Query("select s.id from Student s where s.userId = :userId")
	Optional<UUID> findIdByUserId(UUID userId);

}
