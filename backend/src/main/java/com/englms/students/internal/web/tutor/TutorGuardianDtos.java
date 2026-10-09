package com.englms.students.internal.web.tutor;

import java.util.Optional;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

import com.englms.students.internal.app.GuardianInput;
import com.englms.students.internal.app.GuardianView;
import com.englms.students.internal.app.StudentCommands;

/** Tutor-only DTOs of a student's guardians (personal data, data-model §3; api-catalog.md "tutor: students"). */
final class TutorGuardianDtos {

	private TutorGuardianDtos() {
	}

	@Schema(requiredProperties = { "name" })
	record GuardianRequest(String name, String relationship, String phone, String email, String notes) {

		GuardianInput input() {
			return new GuardianInput(name, relationship, phone, email, notes);
		}

		@Override
		public String toString() {
			return "GuardianRequest[]";
		}

	}

	/** PATCH as {@code UpdateStudentRequest}: absent = unchanged, {@code null} clears (not {@code name}). */
	@Schema(requiredProperties = { "version" })
	static final class UpdateGuardianRequest {

		private Long version;

		private Optional<String> name;

		private Optional<String> relationship;

		private Optional<String> phone;

		private Optional<String> email;

		private Optional<String> notes;

		public Long getVersion() {
			return version;
		}

		public void setVersion(Long version) {
			this.version = version;
		}

		public String getName() {
			return value(name);
		}

		public void setName(String name) {
			this.name = Optional.ofNullable(name);
		}

		@Schema(types = { "string", "null" })
		public String getRelationship() {
			return value(relationship);
		}

		public void setRelationship(String relationship) {
			this.relationship = Optional.ofNullable(relationship);
		}

		@Schema(types = { "string", "null" })
		public String getPhone() {
			return value(phone);
		}

		public void setPhone(String phone) {
			this.phone = Optional.ofNullable(phone);
		}

		@Schema(types = { "string", "null" })
		public String getEmail() {
			return value(email);
		}

		public void setEmail(String email) {
			this.email = Optional.ofNullable(email);
		}

		@Schema(types = { "string", "null" })
		public String getNotes() {
			return value(notes);
		}

		public void setNotes(String notes) {
			this.notes = Optional.ofNullable(notes);
		}

		StudentCommands.GuardianUpdate command() {
			return new StudentCommands.GuardianUpdate(version, name, relationship, phone, email, notes);
		}

		private static <T> T value(Optional<T> field) {
			return (field != null) ? field.orElse(null) : null;
		}

		@Override
		public String toString() {
			return "UpdateGuardianRequest[version=" + version + "]";
		}

	}

	@Schema(requiredProperties = { "id", "name", "relationship", "phone", "email", "notes", "version" })
	record GuardianResponse(UUID id, String name, @Schema(types = { "string", "null" }) String relationship,
			@Schema(types = { "string", "null" }) String phone, @Schema(types = { "string", "null" }) String email,
			@Schema(types = { "string", "null" }) String notes, long version) {

		static GuardianResponse of(GuardianView view) {
			return new GuardianResponse(view.id(), view.name(), view.relationship(), view.phone(), view.email(),
					view.notes(), view.version());
		}

		@Override
		public String toString() {
			return "GuardianResponse[id=" + id + "]";
		}

	}

}
