package com.englms.students.internal.app;

import java.util.List;
import java.util.Optional;

import com.englms.shared.web.TutorPrivate;
import com.englms.students.internal.domain.ContactHandle;
import com.englms.students.internal.domain.CustomField;

/** Raw command input; {@link StudentService} validates it (validation-rules.md). */
public final class StudentCommands {

	private StudentCommands() {
	}

	public record Create(String fullName, String username, String password, String email, String phone,
			List<ContactHandle> contactHandles, String note, List<GuardianInput> guardians) {

		@Override
		public String toString() {
			return "Create[]";
		}

	}

	/**
	 * PATCH semantics (api-conventions.md §3): a {@code null} component is absent (unchanged), {@code Optional.empty()}
	 * is an explicit JSON {@code null} (clear, where allowed).
	 */
	public record Update(Long version, Optional<String> fullName, Optional<String> username, Optional<String> email,
			Optional<String> phone, Optional<List<ContactHandle>> contactHandles, Optional<String> note) {
	}

	/** A guardian PATCH, with the {@link Update} semantics ({@code name} cannot be cleared). */
	public record GuardianUpdate(Long version, Optional<String> name, Optional<String> relationship,
			Optional<String> phone, Optional<String> email, Optional<String> notes) {

		@Override
		public String toString() {
			return "GuardianUpdate[version=" + version + "]";
		}

	}

	/** A learning-profile PUT: every value replaced (absent = cleared); {@code version} {@code null} = first creation. */
	@TutorPrivate
	public record LearningProfilePut(Long version, String currentLevel, String learningNotes, List<String> strengths,
			List<String> weaknesses, List<CustomField> customFields) {

		@Override
		public String toString() {
			return "LearningProfilePut[version=" + version + "]";
		}

	}

}
