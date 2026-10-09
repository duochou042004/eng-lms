package com.englms.students.internal.persistence;

import java.util.List;
import java.util.UUID;

import com.englms.students.internal.domain.Guardian;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface GuardianRepository extends JpaRepository<Guardian, UUID> {

	/** Insertion order (DEC-103). */
	@Query("select g from Guardian g where g.studentId = :studentId order by g.position")
	List<Guardian> findByStudentIdInOrder(UUID studentId);

	long countByStudentId(UUID studentId);

	@Query("select coalesce(max(g.position), 0) from Guardian g where g.studentId = :studentId")
	int maxPosition(UUID studentId);

}
