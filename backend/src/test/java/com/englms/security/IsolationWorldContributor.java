package com.englms.security;

/**
 * Extension point of the isolation fixture world (test-strategy §2): a module that adds a student-visible resource
 * implements this in its test sources as a Spring bean (e.g. {@code @Component} under {@code com.englms}), and the
 * harness calls it after creating the accounts. It inserts A-owned and B-owned rows, registers them with
 * {@link IsolationWorld#ownedByA}/{@link IsolationWorld#ownedByB} and declares the {@code SECRET-*} markers it puts in
 * tutor-private fields with {@link IsolationWorld#secret}.
 */
public interface IsolationWorldContributor {

	void contribute(IsolationWorld world);

	/** Deletes this contributor's rows; runs before the accounts are deleted (rows may reference them). */
	default void reset() {
	}

}
