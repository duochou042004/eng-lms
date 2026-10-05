package com.englms.identity.internal.app;

import java.util.UUID;

import com.englms.identity.CurrentUser;
import com.englms.identity.Role;
import com.englms.identity.internal.domain.UserAccount;

/** What the session endpoint shows about the signed-in user: no hash, no lockout fields. */
public record AccountView(UUID userId, String username, Role role, String displayName, String locale,
		String timeZone, boolean mustChangePassword) {

	static AccountView of(UserAccount account) {
		return new AccountView(account.id(), account.username(), account.role(), account.displayName(),
				account.locale(), account.timeZone(), account.mustChangePassword());
	}

	public CurrentUser currentUser() {
		return new CurrentUser(userId, role, mustChangePassword);
	}

}
