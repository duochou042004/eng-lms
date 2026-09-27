package com.englms.shared.web;

import java.io.IOException;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicBoolean;

import org.apache.catalina.connector.Request;
import org.apache.catalina.connector.Response;
import org.apache.catalina.valves.ErrorReportValve;
import org.apache.coyote.ActionCode;

import com.englms.shared.Ids;
import com.englms.shared.ProblemCodes;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;

/**
 * Replaces Tomcat's HTML error report on the application port (T-M1.8 AC2). Tomcat answers some requests itself
 * before any filter runs (for example an encoded {@code /} in the path, or a raw {@code <} in the query string), so
 * neither {@link RequestIdFilter}, {@link SecurityHeadersFilter} nor {@link ProblemDetailsAdvice} sees them. For such
 * an error with no body yet, this writes RFC 9457 Problem Details (api-conventions.md §5) with the security headers
 * (security.md §5), {@code X-Request-Id} and {@code Cache-Control: no-store}. The body never echoes the request: no
 * {@code instance}, no {@code detail}, no server information, no stack trace.
 */
class ProblemDetailsErrorReportValve extends ErrorReportValve {

	private final Ids ids;

	ProblemDetailsErrorReportValve(Ids ids) {
		this.ids = ids;
		setShowReport(false);
		setShowServerInfo(false);
	}

	@Override
	protected void report(Request request, Response response, Throwable throwable) {
		int status = response.getStatus();
		if (status < 400 || response.getContentWritten() > 0) {
			return;
		}
		AtomicBoolean ioAllowed = new AtomicBoolean(true);
		response.getCoyoteResponse().action(ActionCode.IS_IO_ALLOWED, ioAllowed);
		if (!ioAllowed.get()) {
			return;
		}
		String requestId = (request.getAttribute(RequestIds.ATTRIBUTE) instanceof String id) ? id
				: RequestIds.resolve(request.getHeader(RequestIds.HEADER), ids);
		try {
			SecurityHeadersFilter.apply(response);
			response.setHeader(RequestIds.HEADER, requestId);
			response.setHeader("Cache-Control", "no-store");
			response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
			response.setCharacterEncoding(StandardCharsets.UTF_8.name());
			Writer writer = response.getReporter();
			if (writer != null) {
				writer.write(body(status, requestId));
				response.finishResponse();
			}
		}
		catch (IOException | IllegalStateException ex) {
			// The client is gone or the response is committed: nothing more can be sent.
		}
	}

	static String body(int status, String requestId) {
		ProblemCodes code = ProblemDetailsAdvice.codeFor(HttpStatusCode.valueOf(status));
		HttpStatus known = HttpStatus.resolve(status);
		String title = (known != null) ? known.getReasonPhrase() : "Error";
		// Every value is either a constant or a request ID that matched RequestIds' safe pattern: no escaping needed.
		return "{\"type\":\"" + ProblemDetailsAdvice.TYPE_PREFIX + code.name().toLowerCase().replace('_', '-')
				+ "\",\"title\":\"" + title + "\",\"status\":" + status + ",\"code\":\"" + code.name()
				+ "\",\"requestId\":\"" + requestId + "\"}";
	}

}
