package com.englms.shared.web;

import java.net.URI;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.englms.shared.ProblemCodes;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Maps every error to RFC 9457 Problem Details with a stable {@code code} and the {@code requestId}
 * (api-conventions.md §5). Stack traces and exception messages are never exposed.
 */
@RestControllerAdvice
class ProblemDetailsAdvice extends ResponseEntityExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(ProblemDetailsAdvice.class);

	static final String TYPE_PREFIX = "https://englms.local/problems/";

	@ExceptionHandler(Exception.class)
	ResponseEntity<Object> handleUnexpected(Exception ex, WebRequest request) {
		log.error("Unhandled exception", ex);
		ProblemDetail body = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
		return handleExceptionInternal(ex, body, new HttpHeaders(), HttpStatus.INTERNAL_SERVER_ERROR, request);
	}

	@Override
	protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body, HttpHeaders headers,
			HttpStatusCode statusCode, WebRequest request) {
		ProblemDetail problem = (body instanceof ProblemDetail pd) ? pd : ProblemDetail.forStatus(statusCode);
		ProblemCodes code = codeFor(statusCode);
		problem.setType(URI.create(TYPE_PREFIX + code.name().toLowerCase().replace('_', '-')));
		problem.setDetail(null);
		if (request instanceof ServletWebRequest servletWebRequest) {
			problem.setInstance(URI.create(servletWebRequest.getRequest().getRequestURI()));
		}
		problem.setProperty("code", code.name());
		problem.setProperty("requestId", request.getAttribute(RequestIds.ATTRIBUTE, RequestAttributes.SCOPE_REQUEST));
		return super.handleExceptionInternal(ex, problem, headers, statusCode, request);
	}

	static ProblemCodes codeFor(HttpStatusCode status) {
		return switch (status.value()) {
			case 400 -> ProblemCodes.MALFORMED_REQUEST;
			case 404 -> ProblemCodes.NOT_FOUND;
			case 405 -> ProblemCodes.METHOD_NOT_ALLOWED;
			case 406 -> ProblemCodes.NOT_ACCEPTABLE;
			case 415 -> ProblemCodes.UNSUPPORTED_MEDIA_TYPE;
			case 422 -> ProblemCodes.VALIDATION_FAILED;
			default -> ProblemCodes.INTERNAL_ERROR;
		};
	}

}
