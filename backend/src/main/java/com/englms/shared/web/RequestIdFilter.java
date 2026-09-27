package com.englms.shared.web;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

import com.englms.shared.Ids;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Gives every request an ID (api-conventions.md): a well-formed incoming {@code X-Request-Id} is reused, otherwise a
 * new one is generated. The ID is echoed in the response header, put in the log MDC and exposed to Problem Details.
 * It runs on the application port (this bean) and on the management port ({@link ManagementRequestIdConfiguration}).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class RequestIdFilter extends OncePerRequestFilter {

	private static final Logger log = LoggerFactory.getLogger(RequestIdFilter.class);

	private final Ids ids;

	RequestIdFilter(Ids ids) {
		this.ids = ids;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		String requestId = RequestIds.resolve(request.getHeader(RequestIds.HEADER), ids);
		request.setAttribute(RequestIds.ATTRIBUTE, requestId);
		response.setHeader(RequestIds.HEADER, requestId);
		MDC.put(RequestIds.MDC_KEY, requestId);
		try {
			chain.doFilter(request, response);
		}
		finally {
			log.info("{} {} -> {}", request.getMethod(), request.getRequestURI(), response.getStatus());
			MDC.remove(RequestIds.MDC_KEY);
		}
	}

}
