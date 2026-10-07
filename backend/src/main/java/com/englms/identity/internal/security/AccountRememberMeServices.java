package com.englms.identity.internal.security;

import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.englms.identity.CurrentUser;
import com.englms.identity.SessionTerminator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.RememberMeAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.rememberme.CookieTheftException;
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

	private static final Logger log = LoggerFactory.getLogger(AccountRememberMeServices.class);

	private final JdbcTemplate jdbc;

	private final SessionTerminator sessions;

	AccountRememberMeServices(String key, AccountUserDetailsService users, PersistentTokenRepository tokens,
			JdbcTemplate jdbc, SessionTerminator sessions) {
		super(key, users, tokens);
		this.jdbc = jdbc;
		this.sessions = sessions;
		setCookieName(COOKIE_NAME);
	}

	/**
	 * Set when a presented remember-me cookie did not authenticate (unknown, expired, revoked, or a token already
	 * rotated by a parallel request), so the 401 says {@code SESSION_EXPIRED} rather than {@code UNAUTHENTICATED}.
	 */
	public static final String REJECTED_ATTRIBUTE = AccountRememberMeServices.class.getName() + ".rejected";

	/**
	 * A token that no longer matches its series (Spring Security's theft signal) deletes all of the user's tokens and
	 * would propagate as a 500. Two parallel requests carrying the same cookie trigger it legitimately: the first
	 * rotates the token, the second presents the old one. Accepted (no grace window, LC decision, security.md §3): the
	 * request is answered as anonymous (401 {@code SESSION_EXPIRED}) with a WARN, the user signs in again (SEC review S3-1).
	 */
	@Override
	public Authentication autoLogin(HttpServletRequest request, HttpServletResponse response) {
		boolean presented = extractRememberMeCookie(request) != null;
		Authentication authentication;
		try {
			authentication = super.autoLogin(request, response);
		}
		catch (CookieTheftException ex) {
			log.warn("Remember-me token reused after rotation (parallel requests or a stolen cookie); "
					+ "all remember-me tokens of the user were deleted");
			authentication = null;
		}
		if (presented && authentication == null) {
			request.setAttribute(REJECTED_ATTRIBUTE, Boolean.TRUE);
		}
		return authentication;
	}

	/**
	 * A valid token of an account that is no longer {@code ACTIVE}: Spring Security refuses it (the user is not
	 * enabled) but would keep the token. Every session and token of the account is ended, so none revives it after a
	 * re-enable (T-M2.3 G3 QA-S4-1). A must-change account is refused too, but keeps its tokens (it is active).
	 */
	@Override
	protected UserDetails processAutoLoginCookie(String[] cookieTokens, HttpServletRequest request,
			HttpServletResponse response) {
		UserDetails user = super.processAutoLoginCookie(cookieTokens, request, response);
		if (user instanceof AccountUserDetailsService.AccountUserDetails account && !account.active()) {
			sessions.endAllSessions(account.currentUser().userId());
		}
		return user;
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
		if (cookie == null) {
			return;
		}
		cancelCookie(request, response);
		if (cookie.isEmpty()) {
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
