package com.englms.identity.internal.security;

import java.util.List;
import java.util.UUID;

import com.englms.identity.CurrentUser;
import com.englms.identity.internal.domain.UserAccount;
import com.englms.identity.internal.persistence.UserAccountRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Loads an account by its user ID for remember-me sign-in (the token owner is the user ID). A disabled account is
 * not enabled, so Spring Security's account-status check rejects its cookie (FR-AUTH-10); neither is one that must
 * change its password. The password hash is not
 * handed out: remember-me never checks a password.
 */
@Component
class AccountUserDetailsService implements UserDetailsService {

	private final UserAccountRepository accounts;

	AccountUserDetailsService(UserAccountRepository accounts) {
		this.accounts = accounts;
	}

	@Override
	@Transactional(readOnly = true)
	public UserDetails loadUserByUsername(String userId) {
		UUID id;
		try {
			id = UUID.fromString(userId);
		}
		catch (IllegalArgumentException ex) {
			throw new UsernameNotFoundException("Not a user ID");
		}
		UserAccount account = accounts.findById(id).orElseThrow(() -> new UsernameNotFoundException("No such user"));
		// A must-change account never signs in by remember-me (SEC review S4-3): only with its temporary password.
		return new AccountUserDetails(account.toCurrentUser(), account.isActive() && !account.mustChangePassword(),
				account.isActive());
	}

	static final class AccountUserDetails extends User {

		private final CurrentUser currentUser;

		private final boolean active;

		AccountUserDetails(CurrentUser currentUser, boolean enabled, boolean active) {
			super(currentUser.getName(), "", enabled, true, true, true,
					List.of(new SimpleGrantedAuthority(currentUser.role().authority())));
			this.currentUser = currentUser;
			this.active = active;
		}

		boolean active() {
			return active;
		}

		CurrentUser currentUser() {
			return currentUser;
		}

	}

}
