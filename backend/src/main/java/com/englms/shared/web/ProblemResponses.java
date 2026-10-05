package com.englms.shared.web;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import com.englms.shared.ProblemCodes;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import tools.jackson.databind.json.JsonMapper;

/**
 * Problem Details (api-conventions.md §5) written by filters, where {@link ProblemDetailsAdvice} cannot help: the
 * security entry point, access-denied handler and must-change gate ({@link #write}), and requests rejected before any
 * handler or security filter runs ({@link #writeRejected}, {@link #rejectedBody}). The body has the same shape as the
 * advice's: {@code type}, {@code title}, {@code status}, {@code code}, {@code requestId} (and {@code instance} for
 * {@link #write}).
 */
public final class ProblemResponses {

	private static final JsonMapper JSON = JsonMapper.shared();

	private ProblemResponses() {
	}

	/** A problem for a request that passed the firewall; {@code instance} is the request path. */
	public static void write(HttpServletRequest request, HttpServletResponse response, HttpStatus status,
			ProblemCodes code) throws IOException {
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("type", ProblemDetailsAdvice.TYPE_PREFIX + slug(code));
		body.put("title", status.getReasonPhrase());
		body.put("status", status.value());
		body.put("instance", request.getRequestURI());
		body.put("code", code.name());
		body.put("requestId", request.getAttribute(RequestIds.ATTRIBUTE));
		response.setStatus(status.value());
		response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.getWriter().write(JSON.writeValueAsString(body));
		response.getWriter().flush();
	}

	/**
	 * A request rejected before the security filter chain (Spring Security's firewall: raw dot-segments, forbidden
	 * methods such as {@code TRACE}, …). Same output as {@link ProblemDetailsErrorReportValve}: the security headers,
	 * {@code Cache-Control: no-store}, the request ID, and a body that never echoes the request (no {@code instance}).
	 */
	public static void writeRejected(HttpServletRequest request, HttpServletResponse response, int status)
			throws IOException {
		String requestId = (request.getAttribute(RequestIds.ATTRIBUTE) instanceof String id) ? id : "";
		SecurityHeaders.apply(response);
		response.setHeader(RequestIds.HEADER, requestId);
		response.setHeader("Cache-Control", "no-store");
		response.setStatus(status);
		response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.getWriter().write(rejectedBody(status, requestId));
		response.getWriter().flush();
	}

	static String rejectedBody(int status, String requestId) {
		ProblemCodes code = ProblemDetailsAdvice.codeFor(HttpStatusCode.valueOf(status));
		if (code == ProblemCodes.INTERNAL_ERROR && status < 500) {
			// Tomcat also rejects requests with 4xx statuses the app never produces (e.g. 417 for a bad Expect header):
			// they are client errors, not internal ones (T-M1.8 SEC review S4-2).
			code = ProblemCodes.MALFORMED_REQUEST;
		}
		HttpStatus known = HttpStatus.resolve(status);
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("type", ProblemDetailsAdvice.TYPE_PREFIX + slug(code));
		body.put("title", (known != null) ? known.getReasonPhrase() : "Error");
		body.put("status", status);
		body.put("code", code.name());
		body.put("requestId", requestId);
		return JSON.writeValueAsString(body);
	}

	static String slug(ProblemCodes code) {
		return code.name().toLowerCase().replace('_', '-');
	}

}
