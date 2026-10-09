package com.englms.students.internal.domain;

/** A guardian's editable values, already validated and normalised (trimmed; empty → null). */
public record GuardianDetails(String name, String relationship, String phone, String email, String notes) {

	@Override
	public String toString() {
		return "GuardianDetails[]";
	}

}
