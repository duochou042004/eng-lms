package com.englms.students.internal.web.student;

import static com.englms.shared.web.Audience.Kind.STUDENT;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

import com.englms.shared.web.Audience;
import com.englms.shared.web.CurrentStudent;
import com.englms.students.internal.app.StudentService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The student's own account (api-catalog.md "student: account"; FR-SET-02, T-M2.7). Owner-scoped by
 * {@link CurrentStudent} only (ADR-0016): no student ID in the path, query or body.
 */
@RestController
@Audience(STUDENT)
@RequestMapping(path = "/api/v1/student", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "student: account")
class StudentAccountController {

	private static final String PROBLEM = "#/components/schemas/Problem";

	private final StudentService students;

	StudentAccountController(StudentService students) {
		this.students = students;
	}

	@GetMapping("/account")
	@Operation(summary = "The signed-in student's own full name (as the tutor stored it) and username")
	@ApiResponse(responseCode = "200", description = "The student's name and username")
	@ApiResponse(responseCode = "403", description = "FORBIDDEN_ROLE (not a student) or PASSWORD_CHANGE_REQUIRED",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	StudentAccountResponse account(CurrentStudent me) {
		StudentService.Account account = students.account(me.studentId());
		return new StudentAccountResponse(account.fullName(), account.username());
	}

	/** The student-audience DTO: these two fields only (not the tutor's {@code StudentView}). */
	@Schema(requiredProperties = { "fullName", "username" })
	record StudentAccountResponse(String fullName, String username) {
	}

}
