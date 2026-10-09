package com.englms.students.internal.web.tutor;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

import com.englms.identity.AccountApi.TemporaryCredentials;
import com.englms.students.internal.app.StudentCommands;
import com.englms.students.internal.app.StudentView;
import com.englms.students.internal.domain.ContactHandle;
import com.englms.students.internal.domain.StudentStatus;

/** Tutor-audience DTOs of the students endpoints (api-catalog.md "tutor: students"). */
final class TutorStudentDtos {

	private TutorStudentDtos() {
	}

	@Schema(requiredProperties = { "fullName", "username" })
	record CreateStudentRequest(String fullName, String username,
			@Schema(description = "Optional: generated (shown once in credentials) when absent") String password,
			String email, String phone, List<ContactHandle> contactHandles, String note,
			@Schema(description = "Optional, at most 10; created in the same transaction, listed by GET …/guardians")
			List<TutorGuardianDtos.GuardianRequest> guardians) {

		StudentCommands.Create command() {
			return new StudentCommands.Create(fullName, username, password, email, phone, contactHandles, note,
					(guardians != null)
							? guardians.stream().map(g -> (g != null) ? g.input() : null).toList()
							: null);
		}

		@Override
		public String toString() {
			return "CreateStudentRequest[]";
		}

	}

	/**
	 * PATCH (api-conventions §3): an absent field is unchanged, {@code null} clears it (fullName and username cannot be
	 * cleared). Jackson calls a setter only for a present property, so each field is {@code null} while absent and an
	 * {@link Optional} once present (a record cannot tell absent from {@code null}: Jackson 3 binds both as empty).
	 */
	@Schema(requiredProperties = { "version" })
	static final class UpdateStudentRequest {

		private Long version;

		private Optional<String> fullName;

		private Optional<String> username;

		private Optional<String> email;

		private Optional<String> phone;

		private Optional<List<ContactHandle>> contactHandles;

		private Optional<String> note;

		public Long getVersion() {
			return version;
		}

		public void setVersion(Long version) {
			this.version = version;
		}

		public String getFullName() {
			return value(fullName);
		}

		public void setFullName(String fullName) {
			this.fullName = Optional.ofNullable(fullName);
		}

		public String getUsername() {
			return value(username);
		}

		public void setUsername(String username) {
			this.username = Optional.ofNullable(username);
		}

		@Schema(types = { "string", "null" })
		public String getEmail() {
			return value(email);
		}

		public void setEmail(String email) {
			this.email = Optional.ofNullable(email);
		}

		@Schema(types = { "string", "null" })
		public String getPhone() {
			return value(phone);
		}

		public void setPhone(String phone) {
			this.phone = Optional.ofNullable(phone);
		}

		public List<ContactHandle> getContactHandles() {
			return value(contactHandles);
		}

		public void setContactHandles(List<ContactHandle> contactHandles) {
			this.contactHandles = Optional.ofNullable(contactHandles);
		}

		@Schema(types = { "string", "null" })
		public String getNote() {
			return value(note);
		}

		public void setNote(String note) {
			this.note = Optional.ofNullable(note);
		}

		StudentCommands.Update command() {
			return new StudentCommands.Update(version, fullName, username, email, phone, contactHandles, note);
		}

		private static <T> T value(Optional<T> field) {
			return (field != null) ? field.orElse(null) : null;
		}

	}

	@Schema(requiredProperties = { "status", "version" })
	record StatusRequest(@Schema(allowableValues = { "ACTIVE", "PAUSED", "ARCHIVED" }) String status, Long version) {
	}

	@Schema(requiredProperties = { "id", "fullName", "username", "status", "email", "phone", "contactHandles", "note",
			"createdAt", "updatedAt", "version" })
	record StudentResponse(UUID id, String fullName, String username, StudentStatus status,
			@Schema(types = { "string", "null" }) String email, @Schema(types = { "string", "null" }) String phone,
			List<ContactHandle> contactHandles, @Schema(types = { "string", "null" }) String note, Instant createdAt,
			Instant updatedAt, long version) {

		static StudentResponse of(StudentView view) {
			return new StudentResponse(view.id(), view.fullName(), view.username(), view.status(), view.email(),
					view.phone(), view.contactHandles(), view.note(), view.createdAt(), view.updatedAt(), view.version());
		}

	}

	@Schema(requiredProperties = { "id", "fullName", "username", "status", "email", "phone", "createdAt" })
	record StudentRow(UUID id, String fullName, String username, StudentStatus status,
			@Schema(types = { "string", "null" }) String email, @Schema(types = { "string", "null" }) String phone,
			Instant createdAt) {

		static StudentRow of(StudentView view) {
			return new StudentRow(view.id(), view.fullName(), view.username(), view.status(), view.email(),
					view.phone(), view.createdAt());
		}

	}

	/** Shown once: the temporary password is never returned again (FR-STU-01, FR-AUTH-07). */
	@Schema(requiredProperties = { "username", "temporaryPassword", "expiresAt" })
	record CredentialsResponse(String username, String temporaryPassword, Instant expiresAt) {

		static CredentialsResponse of(TemporaryCredentials credentials) {
			return new CredentialsResponse(credentials.username(), credentials.temporaryPassword(),
					credentials.expiresAt());
		}

		@Override
		public String toString() {
			return "CredentialsResponse[username=" + username + ", expiresAt=" + expiresAt + "]";
		}

	}

	@Schema(requiredProperties = { "student", "credentials" })
	record CreatedStudentResponse(StudentResponse student, CredentialsResponse credentials) {
	}

	@Schema(requiredProperties = { "username" })
	record UsernameSuggestion(String username) {
	}

	@Schema(requiredProperties = { "username", "available", "reason" })
	record UsernameAvailability(String username, boolean available,
			@Schema(types = { "string", "null" }, description = "INVALID or TAKEN; null when available") String reason) {
	}

}
