package com.englms.shared.web;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Baseline response headers from security.md §5 on every response of the application port. There is no Spring
 * Security yet (T-M2.1), so a plain servlet filter sets them. HSTS is Caddy's job (deployment.md), not the app's.
 * {@code frame-src 'none'} stays until the embed allow-list exists.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
class SecurityHeadersFilter extends OncePerRequestFilter {

	static final String CONTENT_SECURITY_POLICY = String.join("; ", "default-src 'self'", "script-src 'self'",
			"style-src 'self'", "img-src 'self' data: blob:", "media-src 'self' blob:", "font-src 'self'",
			"connect-src 'self'", "frame-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'self'",
			"frame-ancestors 'none'");

	static final String PERMISSIONS_POLICY = "microphone=(self), camera=(), geolocation=(), payment=()";

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		response.setHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY);
		response.setHeader("X-Content-Type-Options", "nosniff");
		response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
		response.setHeader("Permissions-Policy", PERMISSIONS_POLICY);
		response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
		chain.doFilter(request, response);
	}

}
