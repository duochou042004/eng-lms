package com.englms.shared;

import java.time.Duration;
import java.util.List;

import org.springframework.http.HttpStatus;

/**
 * A typed application error that maps one-to-one to a Problem Details response (api-conventions.md §5):
 * the status, the {@code code}, optional field errors ({@code errors[]}) and an optional {@code Retry-After}.
 */
public class ProblemException extends RuntimeException {

	private final HttpStatus status;

	private final ProblemCodes code;

	private final List<FieldProblem> errors;

	private final Duration retryAfter;

	public ProblemException(HttpStatus status, ProblemCodes code) {
		this(status, code, List.of(), null);
	}

	public ProblemException(HttpStatus status, ProblemCodes code, List<FieldProblem> errors, Duration retryAfter) {
		super(code.name(), null, false, false);
		this.status = status;
		this.code = code;
		this.errors = List.copyOf(errors);
		this.retryAfter = retryAfter;
	}

	/** 422 {@code VALIDATION_FAILED} with field errors. */
	public static ProblemException validation(List<FieldProblem> errors) {
		return new ProblemException(HttpStatus.UNPROCESSABLE_CONTENT, ProblemCodes.VALIDATION_FAILED, errors, null);
	}

	public HttpStatus status() {
		return status;
	}

	public ProblemCodes code() {
		return code;
	}

	public List<FieldProblem> errors() {
		return errors;
	}

	public Duration retryAfter() {
		return retryAfter;
	}

	/** One {@code errors[]} entry; {@code message} is English for developers, clients map the {@code code}. */
	public record FieldProblem(String field, ProblemCodes code, String message) {
	}

}
