package com.englms.identity.internal.security;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import com.englms.identity.CurrentUser;
import com.englms.identity.SessionTerminator;
import com.englms.identity.internal.domain.AccountStatus;
import com.englms.identity.internal.persistence.UserAccountRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * SEC S4-1 (DEC-092, T-M2.3): a login that commits just before {@code AccountApi.disable} can store its session after
 * the disable ended all sessions. So every authenticated {@code /api/**} request re-reads the account's status (one
 * primary-key read): unless it is {@code ACTIVE}, the session is invalidated, every session and remember-me token of
 * the account is ended, and the request goes on as anonymous,
 * so protected paths and {@code GET /auth/session} answer 401 {@code SESSION_EXPIRED} ({@link AuthProblems}) while
 * public ones (login, logout, meta) still work. Runs right after remember-me, so both kinds of sign-in are covered.
 * ponytail: one read per request; cache per session with the disable as invalidation if it ever shows in profiles.
 */
class AccountStatusFilter extends OncePerRequestFilter {

	/** Set when this filter ended the session, so the 401 says {@code SESSION_EXPIRED}. */
	static final String REFUSED_ATTRIBUTE = AccountStatusFilter.class.getName() + ".refused";

	private static final RequestMatcher API = PathPatternRequestMatcher.pathPattern("/api/**");

	private final UserAccountRepository accounts;

	private final SessionTerminator sessions;

	AccountStatusFilter(UserAccountRepository accounts, SessionTerminator sessions) {
		this.accounts = accounts;
		this.sessions = sessions;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication != null && authentication.getPrincipal() instanceof CurrentUser user && API.matches(request)
				&& accounts.findStatusById(user.userId()).filter(AccountStatus.ACTIVE::equals).isEmpty()) {
			HttpSession session = request.getSession(false);
			if (session != null) {
				session.invalidate();
			}
			SecurityContextHolder.clearContext();
			// Every other session and remember-me token of the account goes too, so none revives it after a re-enable
			// (T-M2.3 G3 QA-S4-1).
			sessions.endAllSessions(user.userId());
			request.setAttribute(REFUSED_ATTRIBUTE, Boolean.TRUE);
		}
		chain.doFilter(request, response);
	}

}
