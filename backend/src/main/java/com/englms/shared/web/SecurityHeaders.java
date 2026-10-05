package com.englms.shared.web;

import jakarta.servlet.http.HttpServletResponse;

/**
 * The one source of the security.md §5 header values. Spring Security's header configuration writes them on every
 * response that passes the filter chain (DEC-054, T-M2.1); {@link #apply} writes the same values on the responses
 * produced outside it: requests Tomcat rejects ({@link ProblemDetailsErrorReportValve}) and requests the firewall
 * rejects ({@link ProblemResponses#writeRejected}). HSTS is Caddy's job (deployment.md), not the app's.
 * {@code frame-src 'none'} stays until the embed allow-list exists.
 */
public final class SecurityHeaders {

	public static final String CONTENT_SECURITY_POLICY = String.join("; ", "default-src 'self'", "script-src 'self'",
			"style-src 'self'", "img-src 'self' data: blob:", "media-src 'self' blob:", "font-src 'self'",
			"connect-src 'self'", "frame-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'self'",
			"frame-ancestors 'none'");

	public static final String PERMISSIONS_POLICY = "microphone=(self), camera=(), geolocation=(), payment=()";

	public static final String REFERRER_POLICY = "strict-origin-when-cross-origin";

	public static final String CROSS_ORIGIN_OPENER_POLICY = "same-origin";

	private SecurityHeaders() {
	}

	public static void apply(HttpServletResponse response) {
		response.setHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY);
		response.setHeader("X-Content-Type-Options", "nosniff");
		response.setHeader("Referrer-Policy", REFERRER_POLICY);
		response.setHeader("Permissions-Policy", PERMISSIONS_POLICY);
		response.setHeader("Cross-Origin-Opener-Policy", CROSS_ORIGIN_OPENER_POLICY);
	}

}
