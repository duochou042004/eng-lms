package com.englms.students.internal.web.tutor;

import static com.englms.shared.web.Audience.Kind.TUTOR;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

import com.englms.identity.CurrentUser;
import com.englms.shared.web.Audience;
import com.englms.shared.web.TutorPrivate;
import com.englms.students.internal.app.LearningProfileService;
import com.englms.students.internal.app.LearningProfileView;
import com.englms.students.internal.app.StudentCommands;
import com.englms.students.internal.domain.CustomField;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** A student's tutor-private learning profile (api-catalog.md "tutor: students"; FR-STU-04, A-008, DEC-103). */
@RestController
@Audience(TUTOR)
@RequestMapping(path = "/api/v1/tutor/students/{sid}/learning-profile", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "tutor: students")
class TutorLearningProfileController {

	private static final String PROBLEM = "#/components/schemas/Problem";

	private final LearningProfileService profiles;

	TutorLearningProfileController(LearningProfileService profiles) {
		this.profiles = profiles;
	}

	@GetMapping
	@Operation(summary = "The learning profile; a student never edited has the empty one (version null)")
	@ApiResponse(responseCode = "200", description = "The profile")
	@ApiResponse(responseCode = "404", description = "NOT_FOUND",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	LearningProfileResponse get(@PathVariable UUID sid) {
		return LearningProfileResponse.of(profiles.get(sid));
	}

	@PutMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Replace the learning profile (absent = cleared); version null creates it")
	@ApiResponse(responseCode = "200", description = "The new profile")
	@ApiResponse(responseCode = "404", description = "NOT_FOUND",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	@ApiResponse(responseCode = "409", description = "STALE_VERSION (also version null when the profile exists)",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	@ApiResponse(responseCode = "422", description = "VALIDATION_FAILED with field codes",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	LearningProfileResponse put(@PathVariable UUID sid, @RequestBody LearningProfileRequest body,
			@AuthenticationPrincipal CurrentUser me) {
		return LearningProfileResponse.of(profiles.put(sid, new StudentCommands.LearningProfilePut(body.version(),
				body.currentLevel(), body.learningNotes(), body.strengths(), body.weaknesses(), body.customFields()),
				me.userId()));
	}

	@TutorPrivate
	@Schema(description = "Every value is replaced; an absent one is cleared. version null (or absent) = first creation")
	record LearningProfileRequest(@Schema(types = { "integer", "null" }, format = "int64") Long version,
			@Schema(types = { "string", "null" }) String currentLevel,
			@Schema(types = { "string", "null" }) String learningNotes, List<String> strengths, List<String> weaknesses,
			List<CustomField> customFields) {

		@Override
		public String toString() {
			return "LearningProfileRequest[version=" + version + "]";
		}

	}

	@TutorPrivate
	@Schema(requiredProperties = { "currentLevel", "learningNotes", "strengths", "weaknesses", "customFields",
			"updatedAt", "version" })
	record LearningProfileResponse(@Schema(types = { "string", "null" }) String currentLevel,
			@Schema(types = { "string", "null" }) String learningNotes, List<String> strengths, List<String> weaknesses,
			List<CustomField> customFields, @Schema(types = { "string", "null" }, format = "date-time") Instant updatedAt,
			@Schema(types = { "integer", "null" }, format = "int64",
					description = "null while the profile was never saved") Long version) {

		static LearningProfileResponse of(LearningProfileView view) {
			return new LearningProfileResponse(view.currentLevel(), view.learningNotes(), view.strengths(),
					view.weaknesses(), view.customFields(), view.updatedAt(), view.version());
		}

		@Override
		public String toString() {
			return "LearningProfileResponse[version=" + version + "]";
		}

	}

}
