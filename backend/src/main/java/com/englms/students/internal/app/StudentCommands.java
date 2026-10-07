package com.englms.students.internal.app;

import java.util.List;
import java.util.Optional;

import com.englms.students.internal.domain.ContactHandle;

/** Raw command input; {@link StudentService} validates it (validation-rules.md). */
public final class StudentCommands {

	private StudentCommands() {
	}

	public record Create(String fullName, String username, String password, String email, String phone,
			List<ContactHandle> contactHandles, String note) {

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

}
