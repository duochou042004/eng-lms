package com.englms.students.internal.app;

import java.util.UUID;

import com.englms.students.internal.domain.Guardian;
import com.englms.students.internal.domain.GuardianDetails;

/** A guardian for the tutor. */
public record GuardianView(UUID id, String name, String relationship, String phone, String email, String notes,
		long version) {

	static GuardianView of(Guardian guardian) {
		GuardianDetails details = guardian.details();
		return new GuardianView(guardian.id(), details.name(), details.relationship(), details.phone(),
				details.email(), details.notes(), guardian.version());
	}

	@Override
	public String toString() {
		return "GuardianView[id=" + id + "]";
	}

}
