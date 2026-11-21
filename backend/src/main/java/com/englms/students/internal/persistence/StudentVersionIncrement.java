package com.englms.students.internal.persistence;

import com.englms.students.internal.domain.Student;

/** A {@link StudentRepository} fragment, so a stale version is translated like any repository call. */
public interface StudentVersionIncrement {

	/**
	 * At once {@code UPDATE student SET version = ? WHERE id = ? AND version = ?} with the managed student's version,
	 * whatever its fields and the clock, and the new version set on {@code student} (DEC-187: a username-only change).
	 * A stale version fails here, inside the service, as Spring's {@code ObjectOptimisticLockingFailureException}.
	 */
	void forceVersionIncrement(Student student);

}
