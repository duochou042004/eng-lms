package com.englms.security;

/**
 * Extension point of the isolation fixture world (test-strategy §2): a module that adds a student-visible resource
 * implements this in its test sources as a Spring bean (e.g. {@code @Component} under {@code com.englms}), and the
 * harness calls it after creating the accounts. It inserts A-owned and B-owned rows, registers them with
 * {@link IsolationWorld#ownedByA}/{@link IsolationWorld#ownedByB} and declares the {@code SECRET-*} markers it puts in
 * tutor-private fields with {@link IsolationWorld#secret}. Contributors run in {@code @Order}; the students contributor
 * ({@code Ordered.HIGHEST_PRECEDENCE}) runs first, so later ones find the student rows ({@code student.user_id}).
 */
public interface IsolationWorldContributor {

	void contribute(IsolationWorld world);

	/** Deletes this contributor's rows; runs before the accounts are deleted (rows may reference them), in reverse order. */
	default void reset() {
	}

}
