package com.englms.students.internal.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.englms.identity.Usernames;

/**
 * A student (data-model.md §2 students, domain-model.md §4.1). The account (username, password) is identity's; this
 * row references it by {@code userId}. {@code searchText} is recomputed on every write: {@link Usernames#normalize}
 * over the full name, email, phone and contact-handle values, so search is accent- and case-insensitive.
 * {@link #toString()} carries no personal data.
 */
@Entity
@Table(name = "student")
public class Student {

	@Id
	private UUID id;

	@Column(updatable = false)
	private UUID userId;

	private String fullName;

	private String searchText;

	private String email;

	private String phone;

	@JdbcTypeCode(SqlTypes.JSON)
	private List<ContactHandle> contactHandles;

	private String note;

	@Enumerated(EnumType.STRING)
	private StudentStatus status;

	@Column(updatable = false)
	private Instant createdAt;

	private Instant updatedAt;

	@Column(updatable = false)
	private UUID createdBy;

	private UUID updatedBy;

	@Version
	private long version;

	protected Student() {
	}

	public Student(UUID id, UUID userId, StudentProfile profile, UUID actor, Instant now) {
		this.id = id;
		this.userId = userId;
		this.status = StudentStatus.ACTIVE;
		this.createdAt = now;
		this.createdBy = actor;
		apply(profile, actor, now);
	}

	/**
	 * Replaces the profile and contacts. {@code version} moves on at flush when a column changed (Hibernate dirty
	 * checking); a PATCH that only renames the account leaves the row, and its version, as it was.
	 */
	public void apply(StudentProfile profile, UUID actor, Instant now) {
		fullName = profile.fullName();
		email = profile.email();
		phone = profile.phone();
		contactHandles = List.copyOf(profile.contactHandles());
		note = profile.note();
		searchText = searchText(profile);
		updatedAt = now;
		updatedBy = actor;
	}

	/** @return the previous status */
	public StudentStatus changeStatus(StudentStatus target, UUID actor, Instant now) {
		if (!status.canBecome(target)) {
			throw new IllegalStateException(status + " → " + target);
		}
		StudentStatus from = status;
		status = target;
		updatedAt = now;
		updatedBy = actor;
		return from;
	}

	static String searchText(StudentProfile profile) {
		return Usernames.normalize(Stream
			.concat(Stream.of(profile.fullName(), profile.email(), profile.phone()),
					profile.contactHandles().stream().map(ContactHandle::value))
			.filter(value -> value != null && !value.isEmpty())
			.collect(Collectors.joining(" ")));
	}

	public StudentProfile profile() {
		return new StudentProfile(fullName, email, phone, contactHandles, note);
	}

	public UUID id() {
		return id;
	}

	public UUID userId() {
		return userId;
	}

	public String fullName() {
		return fullName;
	}

	public StudentStatus status() {
		return status;
	}

	public Instant createdAt() {
		return createdAt;
	}

	public Instant updatedAt() {
		return updatedAt;
	}

	public long version() {
		return version;
	}

	@Override
	public String toString() {
		return "Student[id=" + id + ", status=" + status + "]";
	}

}
