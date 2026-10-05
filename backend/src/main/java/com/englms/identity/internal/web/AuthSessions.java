package com.englms.identity.internal.web;

import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import com.englms.identity.CurrentUser;
import com.englms.identity.internal.security.AccountRememberMeServices;
import com.englms.identity.internal.security.ApiCsrfTokenRepository;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.stereotype.Component;

/**
 * The HTTP-session side of sign-in, password change and logout (ADR-0005): session-ID rotation, the security context
 * stored in the Spring Session JDBC session, CSRF-token rotation, the remember-me cookie.
 */
@Component
class AuthSessions {

	private final SecurityContextHolderStrategy holder = SecurityContextHolder.getContextHolderStrategy();

	private final HttpSessionSecurityContextRepository contexts;

	private final ApiCsrfTokenRepository csrfTokens;

	private final AccountRememberMeServices rememberMe;

	AuthSessions(HttpSessionSecurityContextRepository contexts, ApiCsrfTokenRepository csrfTokens,
			AccountRememberMeServices rememberMe) {
		this.contexts = contexts;
		this.csrfTokens = csrfTokens;
		this.rememberMe = rememberMe;
	}

	/**
	 * After a successful login: rotate the session ID and the CSRF token, store the context, maybe remember-me.
	 * A remember-me token presented with the login (e.g. a previous user's on a shared device) is deleted first (SEC
	 * review S4-2); a new one is issued only on request and never while the password must be changed (S4-3).
	 */
	void signIn(CurrentUser user, boolean rememberMeRequested, HttpServletRequest request,
			HttpServletResponse response) {
		rememberMe.logout(request, response, null);
		Authentication authentication = authentication(user);
		new ChangeSessionIdAuthenticationStrategy().onAuthentication(authentication, request, response);
		new CsrfAuthenticationStrategy(csrfTokens).onAuthentication(authentication, request, response);
		store(authentication, request, response);
		if (rememberMeRequested && !user.mustChangePassword()) {
			request.setAttribute(AccountRememberMeServices.REQUESTED_ATTRIBUTE, Boolean.TRUE);
			rememberMe.loginSuccess(request, response, authentication);
		}
		primeCsrfCookie(request);
	}

	/** After an own-password change: the session ID rotates (privilege change) and the principal is refreshed. */
	void passwordChanged(CurrentUser user, HttpServletRequest request, HttpServletResponse response) {
		new ChangeSessionIdAuthenticationStrategy().onAuthentication(authentication(user), request, response);
		store(authentication(user), request, response);
	}

	/** Ends this session (if any) and the current device's remember-me token, and expires both cookies. */
	void signOut(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
		rememberMe.logout(request, response, authentication);
		new SecurityContextLogoutHandler().logout(request, response, authentication);
	}

	/** The caller's session after its sessions were ended elsewhere: forget it without saving it again. */
	void discard(HttpServletRequest request) {
		HttpSession session = request.getSession(false);
		if (session != null) {
			session.invalidate();
		}
		holder.clearContext();
	}

	/** Writes the {@code XSRF-TOKEN} cookie now (tokens are otherwise loaded lazily). */
	static void primeCsrfCookie(HttpServletRequest request) {
		if (request.getAttribute(CsrfToken.class.getName()) instanceof CsrfToken token) {
			token.getToken();
		}
	}

	private void store(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
		SecurityContext context = holder.createEmptyContext();
		context.setAuthentication(authentication);
		holder.setContext(context);
		contexts.saveContext(context, request, response);
	}

	private static Authentication authentication(CurrentUser user) {
		return UsernamePasswordAuthenticationToken.authenticated(user, null,
				List.of(new SimpleGrantedAuthority(user.role().authority())));
	}

}
