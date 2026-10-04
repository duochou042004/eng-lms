package com.englms.identity.internal.security;

import java.io.IOException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import com.englms.shared.ProblemCodes;
import com.englms.shared.ProblemException;
import com.englms.shared.web.ProblemResponses;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.csrf.CsrfException;

/**
 * The 401 and 403 answers of the filter chain and the auth handlers (api-conventions.md §5, T-M2.1 design notes):
 * no session cookie → {@code UNAUTHENTICATED}; a cookie naming no live session (unknown, idle-expired, logged out) →
 * {@code SESSION_EXPIRED}; a missing or wrong CSRF token → {@code CSRF_INVALID}; the wrong role → {@code FORBIDDEN_ROLE}.
 */
public final class AuthProblems {

	private AuthProblems() {
	}

	public static ProblemCodes unauthenticatedCode(HttpServletRequest request) {
		return (request.getRequestedSessionId() != null && !request.isRequestedSessionIdValid())
				? ProblemCodes.SESSION_EXPIRED : ProblemCodes.UNAUTHENTICATED;
	}

	public static ProblemException unauthenticated(HttpServletRequest request) {
		return new ProblemException(HttpStatus.UNAUTHORIZED, unauthenticatedCode(request));
	}

	static void entryPoint(HttpServletRequest request, HttpServletResponse response, AuthenticationException ex)
			throws IOException {
		ProblemResponses.write(request, response, HttpStatus.UNAUTHORIZED, unauthenticatedCode(request));
	}

	static void accessDenied(HttpServletRequest request, HttpServletResponse response, AccessDeniedException ex)
			throws IOException {
		ProblemResponses.write(request, response, HttpStatus.FORBIDDEN,
				(ex instanceof CsrfException) ? ProblemCodes.CSRF_INVALID : ProblemCodes.FORBIDDEN_ROLE);
	}

}
