package com.englms.students.internal.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.englms.shared.web.TutorPrivate;

/**
 * A student's learning profile (data-model.md §2 {@code student_learning_profile}, FR-STU-04): at most one row per
 * student, tutor-private (A-008, NFR-SEC-02). The row is created by the first {@code PUT}
 * ({@code INSERT … ON CONFLICT DO NOTHING}, DEC-103); until then the student has the empty profile.
 */
@TutorPrivate
@Entity
@Table(name = "student_learning_profile")
public class LearningProfile {

	@Id
	private UUID studentId;

	private String currentLevel;

	private String learningNotes;

	@JdbcTypeCode(SqlTypes.ARRAY)
	private List<String> strengths;

	@JdbcTypeCode(SqlTypes.ARRAY)
	private List<String> weaknesses;

	@JdbcTypeCode(SqlTypes.JSON)
	private List<CustomField> customFields;

	@Column(updatable = false)
	private Instant createdAt;

	private Instant updatedAt;

	@Column(updatable = false)
	private UUID createdBy;

	private UUID updatedBy;

	@Version
	private long version;

	protected LearningProfile() {
	}

	/** Replaces every value unless they equal the current ones (then {@code updatedAt} and {@code version} stay). */
	public void apply(LearningProfileDetails details, UUID actor, Instant now) {
		if (details.equals(details())) {
			return;
		}
		currentLevel = details.currentLevel();
		learningNotes = details.learningNotes();
		strengths = details.strengths();
		weaknesses = details.weaknesses();
		customFields = details.customFields();
		updatedAt = now;
		updatedBy = actor;
	}

	public LearningProfileDetails details() {
		return new LearningProfileDetails(currentLevel, learningNotes, strengths, weaknesses, customFields);
	}

	public Instant updatedAt() {
		return updatedAt;
	}

	public long version() {
		return version;
	}

	@Override
	public String toString() {
		return "LearningProfile[studentId=" + studentId + "]";
	}

}
