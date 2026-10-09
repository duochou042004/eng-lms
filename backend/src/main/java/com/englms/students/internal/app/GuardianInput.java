package com.englms.students.internal.app;

/** A guardian as sent by the tutor (FR-STU-01/03); {@link StudentFields#guardian} validates it. */
public record GuardianInput(String name, String relationship, String phone, String email, String notes) {

	@Override
	public String toString() {
		return "GuardianInput[]";
	}

}
