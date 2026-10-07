package com.englms.students.internal.domain;

import java.util.List;

/** The editable profile and contacts, already validated and normalised (trimmed; empty → null). */
public record StudentProfile(String fullName, String email, String phone, List<ContactHandle> contactHandles, String note) {

	public StudentProfile {
		contactHandles = (contactHandles != null) ? List.copyOf(contactHandles) : List.of();
	}

}
