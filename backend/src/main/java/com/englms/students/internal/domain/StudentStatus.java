package com.englms.students.internal.domain;

/** domain-model.md §4.1. */
public enum StudentStatus {

	ACTIVE, PAUSED, ARCHIVED;

	/** {@code ACTIVE ⇄ PAUSED}, {@code ACTIVE|PAUSED → ARCHIVED}, {@code ARCHIVED → ACTIVE}. */
	public boolean canBecome(StudentStatus target) {
		return switch (this) {
			case ACTIVE -> target == PAUSED || target == ARCHIVED;
			case PAUSED -> target == ACTIVE || target == ARCHIVED;
			case ARCHIVED -> target == ACTIVE;
		};
	}

}
