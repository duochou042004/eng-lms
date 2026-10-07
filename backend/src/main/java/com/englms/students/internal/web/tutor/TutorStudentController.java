package com.englms.students.internal.web.tutor;

import static com.englms.shared.web.Audience.Kind.TUTOR;

import java.net.URI;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

import com.englms.identity.AccountApi.UsernameCheck;
import com.englms.identity.CurrentUser;
import com.englms.shared.ProblemCodes;
import com.englms.shared.ProblemException;
import com.englms.shared.ProblemException.FieldProblem;
import com.englms.shared.web.Audience;
import com.englms.shared.web.PageResponse;
import com.englms.students.internal.app.StudentCommands;
import com.englms.students.internal.app.StudentService;
import com.englms.students.internal.domain.StudentStatus;
import com.englms.students.internal.web.tutor.TutorStudentDtos.CreateStudentRequest;
import com.englms.students.internal.web.tutor.TutorStudentDtos.CreatedStudentResponse;
import com.englms.students.internal.web.tutor.TutorStudentDtos.CredentialsResponse;
import com.englms.students.internal.web.tutor.TutorStudentDtos.StatusRequest;
import com.englms.students.internal.web.tutor.TutorStudentDtos.StudentResponse;
import com.englms.students.internal.web.tutor.TutorStudentDtos.StudentRow;
import com.englms.students.internal.web.tutor.TutorStudentDtos.UpdateStudentRequest;
import com.englms.students.internal.web.tutor.TutorStudentDtos.UsernameAvailability;
import com.englms.students.internal.web.tutor.TutorStudentDtos.UsernameSuggestion;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The tutor's students endpoints (api-catalog.md "tutor: students"; FR-STU-01/02/03/05, FR-AUTH-07). */
@RestController
@Audience(TUTOR)
@RequestMapping(path = "/api/v1/tutor", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "tutor: students")
class TutorStudentController {

	private static final String PROBLEM = "#/components/schemas/Problem";

	static final int MAX_PAGE_SIZE = 100;

	private final StudentService students;

	TutorStudentController(StudentService students) {
		this.students = students;
	}

	@PostMapping(path = "/students", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Create a student with their STUDENT account; the credentials are in this response only")
	@ApiResponse(responseCode = "201", description = "Created; Location names the student")
	@ApiResponse(responseCode = "409", description = "USERNAME_TAKEN (errors[0].field = username)",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	@ApiResponse(responseCode = "422", description = "VALIDATION_FAILED with field codes",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	ResponseEntity<CreatedStudentResponse> create(@RequestBody CreateStudentRequest body,
			@AuthenticationPrincipal CurrentUser me) {
		StudentService.Created created = students.create(new StudentCommands.Create(body.fullName(), body.username(),
				body.password(), body.email(), body.phone(), body.contactHandles(), body.note()), me.userId());
		return ResponseEntity.created(URI.create("/api/v1/tutor/students/" + created.student().id()))
			.body(new CreatedStudentResponse(StudentResponse.of(created.student()),
					CredentialsResponse.of(created.credentials())));
	}

	@GetMapping("/students")
	@Operation(summary = "List students: q (accent-insensitive), status (repeatable; default ACTIVE, PAUSED), "
			+ "page, size, sort = fullName|createdAt[,asc|desc]")
	@ApiResponse(responseCode = "200", description = "A page of students")
	@ApiResponse(responseCode = "422", description = "VALIDATION_FAILED: unknown status or sort, page or size out of range",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	PageResponse<StudentRow> list(@RequestParam(required = false) String q,
			@RequestParam(required = false) List<String> status, @RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "25") int size, @RequestParam(defaultValue = "fullName,asc") String sort) {
		List<FieldProblem> problems = new ArrayList<>();
		Set<StudentStatus> statuses = statuses(status, problems);
		Sort order = sort(sort, problems);
		if (page < 0) {
			problems.add(new FieldProblem("page", ProblemCodes.INVALID_VALUE, "0 or more"));
		}
		if (size < 1 || size > MAX_PAGE_SIZE) {
			problems.add(new FieldProblem("size", ProblemCodes.INVALID_VALUE, "1 to " + MAX_PAGE_SIZE));
		}
		else if (page > Integer.MAX_VALUE / size) {
			// page * size is the query offset: it must fit an int (T-M2.3 G3 SEC-S4-3).
			problems.add(new FieldProblem("page", ProblemCodes.INVALID_VALUE, "page * size beyond the last possible row"));
		}
		if (q != null && q.chars().anyMatch(c -> c < 0x20 && c != '\t' && c != '\n' && c != '\r')) {
			problems.add(new FieldProblem("q", ProblemCodes.INVALID_FORMAT, "Control characters are not allowed"));
		}
		if (!problems.isEmpty()) {
			throw ProblemException.validation(problems);
		}
		return PageResponse.of(students.list(q, statuses, PageRequest.of(page, size, order)), StudentRow::of);
	}

	@GetMapping("/students/{sid}")
	@Operation(summary = "A student's profile and contacts, with its version")
	@ApiResponse(responseCode = "200", description = "The student")
	@ApiResponse(responseCode = "404", description = "NOT_FOUND",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	StudentResponse get(@PathVariable UUID sid) {
		return StudentResponse.of(students.get(sid));
	}

	@PatchMapping(path = "/students/{sid}", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Update the profile and contacts (and the username); version required")
	@ApiResponse(responseCode = "200", description = "The updated student")
	@ApiResponse(responseCode = "404", description = "NOT_FOUND",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	@ApiResponse(responseCode = "409", description = "STALE_VERSION or USERNAME_TAKEN",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	@ApiResponse(responseCode = "422", description = "VALIDATION_FAILED with field codes",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	StudentResponse update(@PathVariable UUID sid, @RequestBody UpdateStudentRequest body,
			@AuthenticationPrincipal CurrentUser me) {
		return StudentResponse.of(students.update(sid, body.command(), me.userId()));
	}

	@PostMapping(path = "/students/{sid}/status", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Change the status: ACTIVE ⇄ PAUSED, ACTIVE|PAUSED → ARCHIVED (ends the sessions), ARCHIVED → ACTIVE")
	@ApiResponse(responseCode = "200", description = "The updated student")
	@ApiResponse(responseCode = "404", description = "NOT_FOUND",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	@ApiResponse(responseCode = "409", description = "INVALID_STATE_TRANSITION or STALE_VERSION",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	@ApiResponse(responseCode = "422", description = "VALIDATION_FAILED (status, version)",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	StudentResponse changeStatus(@PathVariable UUID sid, @RequestBody StatusRequest body,
			@AuthenticationPrincipal CurrentUser me) {
		List<FieldProblem> problems = new ArrayList<>();
		StudentStatus target = status(body.status(), "status", problems);
		if (body.version() == null) {
			problems.add(new FieldProblem("version", ProblemCodes.REQUIRED, "The version read with the student"));
		}
		else if (body.version() < 0) {
			problems.add(new FieldProblem("version", ProblemCodes.INVALID_VALUE, "0 or more"));
		}
		if (!problems.isEmpty()) {
			throw ProblemException.validation(problems);
		}
		return StudentResponse.of(students.changeStatus(sid, target, body.version(), me.userId()));
	}

	@PostMapping("/students/{sid}/password-reset")
	@Operation(summary = "A new temporary password, shown once; ends the student's sessions")
	@ApiResponse(responseCode = "200", description = "The new credentials")
	@ApiResponse(responseCode = "404", description = "NOT_FOUND",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	@ApiResponse(responseCode = "409", description = "INVALID_STATE_TRANSITION: the student is archived",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	CredentialsResponse resetPassword(@PathVariable UUID sid, @AuthenticationPrincipal CurrentUser me) {
		return CredentialsResponse.of(students.resetPassword(sid, me.userId()));
	}

	@GetMapping("/usernames/suggestion")
	@Operation(summary = "A free username suggested from a full name (accents removed, lowercase, numeric suffix)")
	@ApiResponse(responseCode = "200", description = "The suggestion")
	UsernameSuggestion suggestUsername(@RequestParam(defaultValue = "") String fullName) {
		return new UsernameSuggestion(students.suggestUsername(fullName));
	}

	@GetMapping("/usernames/availability")
	@Operation(summary = "Whether a username can be used: available, or reason INVALID / TAKEN")
	@ApiResponse(responseCode = "200", description = "The answer")
	UsernameAvailability usernameAvailability(@RequestParam String username) {
		UsernameCheck check = students.checkUsername(username);
		return new UsernameAvailability(username, check == UsernameCheck.AVAILABLE,
				(check == UsernameCheck.AVAILABLE) ? null : check.name());
	}

	private static Set<StudentStatus> statuses(List<String> values, List<FieldProblem> problems) {
		if (values == null || values.isEmpty()) {
			return EnumSet.of(StudentStatus.ACTIVE, StudentStatus.PAUSED);
		}
		Set<StudentStatus> statuses = EnumSet.noneOf(StudentStatus.class);
		for (String value : values) {
			StudentStatus status = status(value, "status", problems);
			if (status != null) {
				statuses.add(status);
			}
		}
		return statuses;
	}

	private static StudentStatus status(String value, String field, List<FieldProblem> problems) {
		for (StudentStatus status : StudentStatus.values()) {
			if (status.name().equals(value)) {
				return status;
			}
		}
		problems.add(new FieldProblem(field, (value == null) ? ProblemCodes.REQUIRED : ProblemCodes.INVALID_VALUE,
				"One of ACTIVE, PAUSED, ARCHIVED"));
		return null;
	}

	/** api-conventions §4 allow-list: {@code fullName} (default) or {@code createdAt}, {@code asc} (default) or {@code desc}. */
	private static Sort sort(String value, List<FieldProblem> problems) {
		String[] parts = value.split(",", -1);
		String property = parts[0];
		String direction = (parts.length > 1) ? parts[1] : "asc";
		if (parts.length > 2 || !List.of("fullName", "createdAt").contains(property)
				|| !List.of("asc", "desc").contains(direction)) {
			problems.add(new FieldProblem("sort", ProblemCodes.INVALID_VALUE,
					"fullName or createdAt, optionally ,asc or ,desc"));
			return Sort.unsorted();
		}
		return Sort.by(Sort.Direction.fromString(direction), property);
	}

}
