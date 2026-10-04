package com.englms.identity.events;

import java.util.UUID;

/**
 * A failed sign-in, or a wrong current password on a password change. {@code userId} is null for an unknown
 * username; the attempted username and password are never part of the event.
 */
public record LoginFailed(UUID userId, Reason reason, ClientInfo client) {

	public enum Reason {

		UNKNOWN_USERNAME, BAD_PASSWORD, ACCOUNT_LOCKED, ACCOUNT_DISABLED, TEMPORARY_PASSWORD_EXPIRED,
		CURRENT_PASSWORD_INCORRECT

	}

}
