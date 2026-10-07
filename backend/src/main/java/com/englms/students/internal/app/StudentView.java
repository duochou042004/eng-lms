package com.englms.students.internal.app;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.englms.students.internal.domain.ContactHandle;
import com.englms.students.internal.domain.Student;
import com.englms.students.internal.domain.StudentProfile;
import com.englms.students.internal.domain.StudentStatus;

/** A student with its account's username, for the tutor. */
public record StudentView(UUID id, String fullName, String username, StudentStatus status, String email, String phone,
		List<ContactHandle> contactHandles, String note, Instant createdAt, Instant updatedAt, long version) {

	static StudentView of(Student student, String username) {
		StudentProfile profile = student.profile();
		return new StudentView(student.id(), profile.fullName(), username, student.status(), profile.email(),
				profile.phone(), profile.contactHandles(), profile.note(), student.createdAt(), student.updatedAt(),
				student.version());
	}

}
