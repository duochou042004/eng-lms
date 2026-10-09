package com.englms.students.internal.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/**
 * A guardian of a student (data-model.md §2 {@code student_guardian}, FR-STU-03, A-005): stored contact values, no
 * account. {@code position} keeps the insertion order (DEC-103; never compacted). {@link #toString()} carries no
 * personal data.
 */
@Entity
@Table(name = "student_guardian")
public class Guardian {

	@Id
	private UUID id;

	@Column(updatable = false)
	private UUID studentId;

	private String name;

	private String relationship;

	private String phone;

	private String email;

	private String notes;

	@Column(updatable = false)
	private int position;

	@Column(updatable = false)
	private Instant createdAt;

	private Instant updatedAt;

	@Column(updatable = false)
	private UUID createdBy;

	private UUID updatedBy;

	@Version
	private long version;

	protected Guardian() {
	}

	public Guardian(UUID id, UUID studentId, int position, GuardianDetails details, UUID actor, Instant now) {
		this.id = id;
		this.studentId = studentId;
		this.position = position;
		this.createdAt = now;
		this.createdBy = actor;
		apply(details, actor, now);
	}

	/** Replaces the values unless they equal the current ones (then {@code updatedAt} and {@code version} stay). */
	public void apply(GuardianDetails details, UUID actor, Instant now) {
		if (name != null && details.equals(details())) {
			return;
		}
		name = details.name();
		relationship = details.relationship();
		phone = details.phone();
		email = details.email();
		notes = details.notes();
		updatedAt = now;
		updatedBy = actor;
	}

	public GuardianDetails details() {
		return new GuardianDetails(name, relationship, phone, email, notes);
	}

	public UUID id() {
		return id;
	}

	public UUID studentId() {
		return studentId;
	}

	public long version() {
		return version;
	}

	@Override
	public String toString() {
		return "Guardian[id=" + id + ", studentId=" + studentId + "]";
	}

}
