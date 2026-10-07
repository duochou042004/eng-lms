package com.englms.shared.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.SQLException;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.ServletWebRequest;

/** T-M2.3 G3 QA-S3-1 backstop: a character the database refuses is a 422, and its message is never logged. */
@ExtendWith(OutputCaptureExtension.class)
class ProblemDetailsAdviceTest {

	final ProblemDetailsAdvice advice = new ProblemDetailsAdvice();

	ResponseEntity<Object> handle(Exception ex) {
		return advice.handleUnexpected(ex, new ServletWebRequest(new MockHttpServletRequest("POST", "/api/v1/tutor/x")));
	}

	@ParameterizedTest
	@ValueSource(strings = { "22021", "22P05" })
	void aRefusedInputCharacterIs422WithoutLoggingTheMessage(String sqlState, CapturedOutput output) {
		Exception ex = new DataIntegrityViolationException("could not execute statement",
				new SQLException("ERROR: invalid byte sequence; value SECRET-PERSONAL-VALUE", sqlState));

		ResponseEntity<Object> response = handle(ex);

		assertThat(response.getStatusCode().value()).isEqualTo(422);
		assertThat(((ProblemDetail) response.getBody()).getProperties()).containsEntry("code", "VALIDATION_FAILED");
		assertThat(output.getAll()).doesNotContain("SECRET-PERSONAL-VALUE").contains(sqlState);
	}

	@Test
	void anyOtherErrorStaysA500(CapturedOutput output) {
		ResponseEntity<Object> response = handle(new IllegalStateException("boom"));

		assertThat(response.getStatusCode().value()).isEqualTo(500);
		assertThat(output.getAll()).contains("Unhandled exception");
	}

}
