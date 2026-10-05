package com.englms.identity;

/** The two platform roles (SPEC §3). Never taken from the client (security.md T11). */
public enum Role {

	TUTOR, STUDENT;

	/** The Spring Security authority, e.g. {@code ROLE_TUTOR}. */
	public String authority() {
		return "ROLE_" + name();
	}

}
