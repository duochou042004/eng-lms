package com.englms.shared.web;

import java.io.IOException;
import java.util.List;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.UrlPathHelper;

/**
 * Same-origin SPA serving (ADR-0004): a client-side route such as {@code /tutor} or {@code /student/x} is answered
 * with {@code index.html}, so a reload or a deep link works. Only GET/HEAD requests that accept HTML, for paths whose
 * last segment has no file extension, fall back. Nothing under {@code /api}, {@code /actuator} or {@code /assets}
 * ever does: unknown API paths stay Problem Details 404s and a missing asset stays a 404.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
class SpaFallbackFilter extends OncePerRequestFilter {

	static final String INDEX = "/index.html";

	private static final List<String> EXCLUDED_ROOTS = List.of("/api", "/actuator", "/assets");

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		if (isSpaRoute(request)) {
			request.getRequestDispatcher(INDEX).forward(request, response);
			return;
		}
		chain.doFilter(request, response);
	}

	static boolean isSpaRoute(HttpServletRequest request) {
		String method = request.getMethod();
		if (!"GET".equals(method) && !"HEAD".equals(method)) {
			return false;
		}
		// Decoded, normalised and without ;path-parameters, as the handler mapping sees it.
		String path = UrlPathHelper.defaultInstance.getPathWithinApplication(request);
		for (String root : EXCLUDED_ROOTS) {
			if (path.equals(root) || path.startsWith(root + "/")) {
				return false;
			}
		}
		String lastSegment = path.substring(path.lastIndexOf('/') + 1);
		return !lastSegment.contains(".") && acceptsHtml(request.getHeader(HttpHeaders.ACCEPT));
	}

	private static boolean acceptsHtml(String accept) {
		if (accept == null || accept.isBlank()) {
			return true;
		}
		try {
			return MediaType.parseMediaTypes(accept)
				.stream()
				.anyMatch(type -> type.getQualityValue() > 0 && type.isCompatibleWith(MediaType.TEXT_HTML));
		}
		catch (InvalidMediaTypeException ex) {
			return false;
		}
	}

}
