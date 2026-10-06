package com.englms.shared.web;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Who may call a handler (ADR-0016 §5, security.md §4 L2). Required on every handler method or its class (the method
 * wins); {@link AudienceVerifier} checks it against the path namespace at startup.
 */
@Target({ ElementType.METHOD, ElementType.TYPE })
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Audience {

	Kind value();

	enum Kind {

		/** {@code /api/v1/tutor/**} only. */
		TUTOR,
		/** {@code /api/v1/student/**} only. */
		STUDENT,
		/** Anonymous callers too: {@code /api/v1/auth/**} and {@code GET /api/v1/meta}, where the URL gate is open. */
		PUBLIC,
		/** Any signed-in user (the handler checks the session): {@code /api/v1/auth/**} only. */
		AUTHENTICATED

	}

}
