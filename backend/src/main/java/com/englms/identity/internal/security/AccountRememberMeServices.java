package com.englms.identity.internal.security;

import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import com.englms.identity.CurrentUser;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.RememberMeAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.rememberme.InvalidCookieException;
import org.springframework.security.web.authentication.rememberme.PersistentTokenBasedRememberMeServices;
import org.springframework.security.web.authentication.rememberme.PersistentTokenRepository;

/**
 * Optional 30-day remember-me with persistent tokens in {@code persistent_logins} (ADR-0005, A-021). Differences
 * from the stock service: the JSON login asks for it with a request attribute (there is no form parameter), the
 * resulting principal is a {@link CurrentUser} as for a password login, and logout deletes only the current
 * device's token (AC6); ending all of a user's tokens is {@code SessionTerminator}'s job.
 */
public class AccountRememberMeServices extends PersistentTokenBasedRememberMeServices {

	public static final String COOKIE_NAME = "ENGLMS_REMEMBER_ME";

	/** Set to {@code Boolean.TRUE} by the login handler when the user asked to stay signed in. */
	public static final String REQUESTED_ATTRIBUTE = AccountRememberMeServices.class.getName() + ".requested";

	private final JdbcTemplate jdbc;

	AccountRememberMeServices(String key, AccountUserDetailsService users, PersistentTokenRepository tokens,
			JdbcTemplate jdbc) {
		super(key, users, tokens);
		this.jdbc = jdbc;
		setCookieName(COOKIE_NAME);
	}

	@Override
	protected boolean rememberMeRequested(HttpServletRequest request, String parameter) {
		return Boolean.TRUE.equals(request.getAttribute(REQUESTED_ATTRIBUTE));
	}

	@Override
	protected Authentication createSuccessfulAuthentication(HttpServletRequest request, UserDetails user) {
		CurrentUser currentUser = ((AccountUserDetailsService.AccountUserDetails) user).currentUser();
		RememberMeAuthenticationToken token = new RememberMeAuthenticationToken(getKey(), currentUser,
				List.of(new SimpleGrantedAuthority(currentUser.role().authority())));
		token.setDetails(getAuthenticationDetailsSource().buildDetails(request));
		return token;
	}

	@Override
	public void logout(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
		String cookie = extractRememberMeCookie(request);
		cancelCookie(request, response);
		if (cookie == null || cookie.isEmpty()) {
			return;
		}
		try {
			String[] tokens = decodeCookie(cookie);
			if (tokens.length == 2) {
				jdbc.update("DELETE FROM persistent_logins WHERE series = ?", tokens[0]);
			}
		}
		catch (InvalidCookieException ex) {
			// Nothing to delete for a malformed cookie.
		}
	}

}
