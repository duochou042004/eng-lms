package com.englms.students.internal.persistence;

import java.time.Instant;
import java.util.UUID;

import com.englms.students.internal.domain.LearningProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface LearningProfileRepository extends JpaRepository<LearningProfile, UUID> {

	/**
	 * The first {@code PUT} (DEC-103): an empty row unless one exists. 0 rows means another request created it first;
	 * no primary-key exception, no vendor log line, no rollback-only transaction. A concurrent first insert waits for
	 * the other transaction and then answers 0.
	 * @return the number of rows inserted (0 or 1)
	 */
	@Modifying
	@Query(nativeQuery = true, value = """
			INSERT INTO student_learning_profile (student_id, created_at, updated_at, created_by, updated_by)
			VALUES (:studentId, :now, :now, :actor, :actor)
			ON CONFLICT (student_id) DO NOTHING""")
	int insertEmptyIfAbsent(UUID studentId, Instant now, UUID actor);

}
