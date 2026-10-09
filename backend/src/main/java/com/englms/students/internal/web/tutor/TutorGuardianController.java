package com.englms.students.internal.web.tutor;

import static com.englms.shared.web.Audience.Kind.TUTOR;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

import com.englms.identity.CurrentUser;
import com.englms.shared.web.Audience;
import com.englms.students.internal.app.GuardianService;
import com.englms.students.internal.web.tutor.TutorGuardianDtos.GuardianRequest;
import com.englms.students.internal.web.tutor.TutorGuardianDtos.GuardianResponse;
import com.englms.students.internal.web.tutor.TutorGuardianDtos.UpdateGuardianRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** A student's guardians (api-catalog.md "tutor: students"; FR-STU-03, A-005, DEC-103). */
@RestController
@Audience(TUTOR)
@RequestMapping(path = "/api/v1/tutor", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "tutor: students")
class TutorGuardianController {

	private static final String PROBLEM = "#/components/schemas/Problem";

	private final GuardianService guardians;

	TutorGuardianController(GuardianService guardians) {
		this.guardians = guardians;
	}

	@GetMapping("/students/{sid}/guardians")
	@Operation(summary = "A student's guardians in insertion order")
	@ApiResponse(responseCode = "200", description = "The guardians")
	@ApiResponse(responseCode = "404", description = "NOT_FOUND",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	List<GuardianResponse> list(@PathVariable UUID sid) {
		return guardians.list(sid).stream().map(GuardianResponse::of).toList();
	}

	@PostMapping(path = "/students/{sid}/guardians", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Add a guardian (at most 10 per student)")
	@ApiResponse(responseCode = "201", description = "Created; Location names the guardian")
	@ApiResponse(responseCode = "404", description = "NOT_FOUND",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	@ApiResponse(responseCode = "422", description = "VALIDATION_FAILED with field codes (guardians: TOO_MANY)",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	ResponseEntity<GuardianResponse> add(@PathVariable UUID sid, @RequestBody GuardianRequest body,
			@AuthenticationPrincipal CurrentUser me) {
		GuardianResponse created = GuardianResponse.of(guardians.add(sid, body.input(), me.userId()));
		return ResponseEntity.created(URI.create("/api/v1/tutor/guardians/" + created.id())).body(created);
	}

	@PatchMapping(path = "/guardians/{gid}", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Update a guardian; version required")
	@ApiResponse(responseCode = "200", description = "The updated guardian")
	@ApiResponse(responseCode = "404", description = "NOT_FOUND",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	@ApiResponse(responseCode = "409", description = "STALE_VERSION",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	@ApiResponse(responseCode = "422", description = "VALIDATION_FAILED with field codes",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	GuardianResponse update(@PathVariable UUID gid, @RequestBody UpdateGuardianRequest body,
			@AuthenticationPrincipal CurrentUser me) {
		return GuardianResponse.of(guardians.update(gid, body.command(), me.userId()));
	}

	@DeleteMapping("/guardians/{gid}")
	@Operation(summary = "Delete a guardian")
	@ApiResponse(responseCode = "204", description = "Deleted")
	@ApiResponse(responseCode = "404", description = "NOT_FOUND",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	ResponseEntity<Void> delete(@PathVariable UUID gid) {
		guardians.delete(gid);
		return ResponseEntity.noContent().build();
	}

}
