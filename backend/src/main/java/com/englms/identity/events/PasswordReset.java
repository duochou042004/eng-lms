package com.englms.identity.events;

import java.util.UUID;

/**
 * A password replaced by a temporary one: by the operator CLI (FR-AUTH-09, {@code actorUserId} null) or by the tutor
 * for a student (FR-AUTH-07, T-M2.3).
 */
public record PasswordReset(UUID userId, Actor actor, UUID actorUserId) {

	public enum Actor {

		OPERATOR, TUTOR

	}

}
