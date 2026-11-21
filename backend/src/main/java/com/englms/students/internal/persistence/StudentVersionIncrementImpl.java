package com.englms.students.internal.persistence;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import com.englms.students.internal.domain.Student;

class StudentVersionIncrementImpl implements StudentVersionIncrement {

	private final EntityManager entityManager;

	StudentVersionIncrementImpl(EntityManager entityManager) {
		this.entityManager = entityManager;
	}

	@Override
	public void forceVersionIncrement(Student student) {
		// Not OPTIMISTIC_FORCE_INCREMENT: that one runs at commit, after the controller (a 500, not a 409).
		entityManager.lock(student, LockModeType.PESSIMISTIC_FORCE_INCREMENT);
	}

}
