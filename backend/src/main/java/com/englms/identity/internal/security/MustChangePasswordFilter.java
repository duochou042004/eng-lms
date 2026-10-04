package com.englms.identity.internal.security;

import java.io.IOException;
import java.util.List;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import com.englms.identity.CurrentUser;
import com.englms.shared.ProblemCodes;
import com.englms.shared.web.ProblemResponses;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * FR-AUTH-06: while the signed-in user must change their password, every {@code /api/**} request answers 403
 * {@code PASSWORD_CHANGE_REQUIRED}, except reading the session, changing the password, logging out and the public
 * {@code GET /api/v1/meta} (DEC-089). It runs after the L1 role check and before handler lookup, so it also
 * covers paths without a handler (T-M2.1 design notes, R3 D3-1). The SPA's own files are not gated.
 */
class MustChangePasswordFilter extends OncePerRequestFilter {

	private static final RequestMatcher API = PathPatternRequestMatcher.pathPattern("/api/**");

	private static final List<RequestMatcher> ALLOWED = List.of(
			PathPatternRequestMatcher.pathPattern(HttpMethod.GET, "/api/v1/auth/session"),
			PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/v1/auth/password"),
			PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/v1/auth/logout"),
			PathPatternRequestMatcher.pathPattern(HttpMethod.GET, "/api/v1/meta"));

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication != null && authentication.getPrincipal() instanceof CurrentUser user
				&& user.mustChangePassword() && API.matches(request)
				&& ALLOWED.stream().noneMatch(matcher -> matcher.matches(request))) {
			ProblemResponses.write(request, response, HttpStatus.FORBIDDEN, ProblemCodes.PASSWORD_CHANGE_REQUIRED);
			return;
		}
		chain.doFilter(request, response);
	}

}
