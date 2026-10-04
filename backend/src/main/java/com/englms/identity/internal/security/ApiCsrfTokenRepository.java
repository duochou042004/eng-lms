package com.englms.identity.internal.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;

/**
 * The SPA's {@code XSRF-TOKEN} cookie ({@link CookieCsrfTokenRepository}), written only on {@code /api/**} responses
 * (QA F2): the SPA primes it with {@code GET /api/v1/auth/session}, and cacheable responses (hashed assets,
 * {@code index.html}) never carry a {@code Set-Cookie}. Tokens are still checked on every unsafe request.
 */
public class ApiCsrfTokenRepository implements CsrfTokenRepository {

	private static final RequestMatcher API = PathPatternRequestMatcher.pathPattern("/api/**");

	private final CookieCsrfTokenRepository cookies;

	ApiCsrfTokenRepository(CookieCsrfTokenRepository cookies) {
		this.cookies = cookies;
	}

	@Override
	public CsrfToken generateToken(HttpServletRequest request) {
		return cookies.generateToken(request);
	}

	@Override
	public void saveToken(CsrfToken token, HttpServletRequest request, HttpServletResponse response) {
		if (API.matches(request)) {
			cookies.saveToken(token, request, response);
		}
	}

	@Override
	public CsrfToken loadToken(HttpServletRequest request) {
		return cookies.loadToken(request);
	}

}
