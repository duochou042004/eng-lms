package com.englms.settings.internal.web;

import static com.englms.shared.web.Audience.Kind.TUTOR;

import java.security.Principal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

import com.englms.settings.internal.WorkspaceSettingsService;
import com.englms.settings.internal.WorkspaceSettingsService.WorkspaceCommand;
import com.englms.settings.internal.WorkspaceSettingsService.WorkspaceView;
import com.englms.shared.web.Audience;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The tutor's workspace settings (api-catalog.md "tutor: settings"; FR-SET-01, T-M2.35). */
@RestController
@Audience(TUTOR)
@RequestMapping(path = "/api/v1/tutor", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "tutor: settings")
class TutorSettingsController {

	private static final String PROBLEM = "#/components/schemas/Problem";

	private final WorkspaceSettingsService settings;

	TutorSettingsController(WorkspaceSettingsService settings) {
		this.settings = settings;
	}

	@GetMapping("/settings")
	@Operation(summary = "The workspace settings, with their version; displayName is the effective name")
	@ApiResponse(responseCode = "200", description = "The workspace settings")
	SettingsResponse get() {
		return SettingsResponse.of(settings.get());
	}

	@PatchMapping(path = "/settings", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Change the workspace name and the defaults for new students; absent properties stay; version required")
	@ApiResponse(responseCode = "200", description = "The workspace settings after the change")
	@ApiResponse(responseCode = "409", description = "STALE_VERSION",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	@ApiResponse(responseCode = "422", description = "VALIDATION_FAILED with field codes (REQUIRED, INVALID_VALUE, "
			+ "TOO_LONG, INVALID_FORMAT); a body without displayName, defaultLocale and defaultTimeZone is REQUIRED on displayName",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	SettingsResponse update(@RequestBody SettingsRequest body, Principal me) {
		return SettingsResponse.of(settings.update(body.command(), UUID.fromString(me.getName())));
	}

	@Schema(requiredProperties = { "displayName", "defaultLocale", "defaultTimeZone", "version", "updatedAt" })
	record SettingsResponse(String displayName, String defaultLocale, String defaultTimeZone, long version,
			Instant updatedAt) {

		static SettingsResponse of(WorkspaceView view) {
			return new SettingsResponse(view.displayName(), view.defaultLocale(), view.defaultTimeZone(), view.version(),
					view.updatedAt());
		}

	}

	/**
	 * PATCH (api-conventions §3) with the setter pattern of {@code TutorStudentDtos.UpdateStudentRequest}: a field is
	 * {@code null} while absent and an {@link Optional} once present. Only these four properties are read.
	 */
	@Schema(requiredProperties = { "version" })
	static final class SettingsRequest {

		private Long version;

		private Optional<String> displayName;

		private Optional<String> defaultLocale;

		private Optional<String> defaultTimeZone;

		public Long getVersion() {
			return version;
		}

		public void setVersion(Long version) {
			this.version = version;
		}

		@Schema(description = "The workspace name: 1-120 characters, no control, bidirectional or zero-width character; cannot be cleared")
		public String getDisplayName() {
			return value(displayName);
		}

		public void setDisplayName(String displayName) {
			this.displayName = Optional.ofNullable(displayName);
		}

		@Schema(description = "One of GET /meta locales")
		public String getDefaultLocale() {
			return value(defaultLocale);
		}

		public void setDefaultLocale(String defaultLocale) {
			this.defaultLocale = Optional.ofNullable(defaultLocale);
		}

		@Schema(description = "A time-zone ID the server's java.time knows, exact (aliases accepted as given)")
		public String getDefaultTimeZone() {
			return value(defaultTimeZone);
		}

		public void setDefaultTimeZone(String defaultTimeZone) {
			this.defaultTimeZone = Optional.ofNullable(defaultTimeZone);
		}

		WorkspaceCommand command() {
			return new WorkspaceCommand(version, displayName, defaultLocale, defaultTimeZone);
		}

		private static String value(Optional<String> field) {
			return (field != null) ? field.orElse(null) : null;
		}

	}

}
