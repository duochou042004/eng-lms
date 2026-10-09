package com.englms.identity.internal.app;

import java.util.UUID;

import com.englms.identity.CurrentUser;
import com.englms.identity.Role;
import com.englms.identity.internal.domain.UserAccount;

/**
 * What the session endpoint shows about the signed-in user: no hash, no lockout fields. {@code credentialStamp} is
 * only for the principal ({@link #currentUser()}), never in a response (DEC-100 S4-5).
 */
public record AccountView(UUID userId, String username, Role role, String displayName, String locale,
		String timeZone, boolean mustChangePassword, long credentialStamp) {

	static AccountView of(UserAccount account) {
		return new AccountView(account.id(), account.username(), account.role(), account.displayName(),
				account.locale(), account.timeZone(), account.mustChangePassword(), account.credentialStamp());
	}

	public CurrentUser currentUser() {
		return new CurrentUser(userId, role, mustChangePassword, credentialStamp);
	}

}
