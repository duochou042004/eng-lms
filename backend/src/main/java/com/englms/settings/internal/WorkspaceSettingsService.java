package com.englms.settings.internal;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.OptionalInt;
import java.util.UUID;
import java.util.function.Predicate;

import com.englms.settings.SettingsApi;
import com.englms.shared.Names;
import com.englms.shared.ProblemCodes;
import com.englms.shared.ProblemException;
import com.englms.shared.ProblemException.FieldProblem;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The workspace settings document (FR-SET-01, T-M2.35): read by {@code GET /tutor/settings}, {@code GET /meta} and
 * {@link SettingsApi#accountDefaults()}, changed by {@code PATCH /tutor/settings} (validation-rules "workspace").
 * Checks in order: the body (422, every problem at once), the version (409), then the write; no audit entry, no event.
 */
@Service
public class WorkspaceSettingsService implements SettingsApi {

	static final int DISPLAY_NAME_MAX = 120;

	private final WorkspaceSettingRepository settings;

	private final MetaProperties meta;

	private final Clock clock;

	WorkspaceSettingsService(WorkspaceSettingRepository settings, MetaProperties meta, Clock clock) {
		this.settings = settings;
		this.meta = meta;
		this.clock = clock;
	}

	@Override
	@Transactional(readOnly = true)
	public AccountDefaults accountDefaults() {
		WorkspaceDocument document = workspace().value();
		return new AccountDefaults(document.defaultLocale(), document.defaultTimeZone());
	}

	/** The name shown in the shells and on the sign-in page: the stored one, else the configured one. */
	@Transactional(readOnly = true)
	public String displayName() {
		return effectiveName(workspace().value());
	}

	@Transactional(readOnly = true)
	public WorkspaceView get() {
		return view(workspace());
	}

	@Transactional
	public WorkspaceView update(WorkspaceCommand command, UUID actor) {
		List<FieldProblem> problems = new ArrayList<>();
		if (command.version() == null) {
			problems.add(new FieldProblem("version", ProblemCodes.REQUIRED, "The version read with the settings"));
		}
		else if (command.version() < 0) {
			problems.add(new FieldProblem("version", ProblemCodes.INVALID_VALUE, "0 or more"));
		}
		if (command.isEmpty()) {
			problems.add(new FieldProblem("displayName", ProblemCodes.REQUIRED,
					"Send at least one of displayName, defaultLocale, defaultTimeZone"));
		}
		String displayName = (command.displayName() != null) ? displayName(command.displayName().orElse(null), problems)
				: null;
		String locale = choice(command.defaultLocale(), "defaultLocale", meta.locales()::contains, problems);
		String timeZone = choice(command.defaultTimeZone(), "defaultTimeZone", ZoneId.getAvailableZoneIds()::contains,
				problems);
		if (!problems.isEmpty()) {
			throw ProblemException.validation(problems);
		}
		WorkspaceSetting row = workspace();
		if (row.version() != command.version()) {
			throw new ProblemException(HttpStatus.CONFLICT, ProblemCodes.STALE_VERSION);
		}
		WorkspaceDocument current = row.value();
		row.apply(new WorkspaceDocument((displayName != null) ? displayName : current.displayName(),
				(locale != null) ? locale : current.defaultLocale(), (timeZone != null) ? timeZone : current.defaultTimeZone()),
				actor, clock.instant());
		// Flushes now: the response carries the new version, and a lost race is a 409 here (ProblemDetailsAdvice).
		return view(settings.saveAndFlush(row));
	}

	private WorkspaceSetting workspace() {
		// The migration seeds the row and the app never inserts one: a missing row is a server fault (500).
		return settings.findById(WorkspaceSetting.WORKSPACE)
			.orElseThrow(() -> new IllegalStateException("The workspace_setting row 'workspace' is missing"));
	}

	private WorkspaceView view(WorkspaceSetting row) {
		WorkspaceDocument document = row.value();
		return new WorkspaceView(effectiveName(document), document.defaultLocale(), document.defaultTimeZone(),
				row.version(), row.updatedAt());
	}

	private String effectiveName(WorkspaceDocument document) {
		return (document.displayName() != null) ? document.displayName() : meta.displayName();
	}

	/** Absent → {@code null} (unchanged); {@code null} → {@code REQUIRED}; outside the allowed set (exact) → {@code INVALID_VALUE}. */
	private static String choice(Optional<String> value, String field, Predicate<String> allowed,
			List<FieldProblem> problems) {
		if (value == null) {
			return null;
		}
		if (value.isEmpty()) {
			problems.add(new FieldProblem(field, ProblemCodes.REQUIRED, "Required"));
		}
		else if (!allowed.test(value.get())) {
			problems.add(new FieldProblem(field, ProblemCodes.INVALID_VALUE, "Not an allowed value"));
		}
		else {
			return value.get();
		}
		return null;
	}

	/** The shared name rule ({@link Names}): stripped, 1–120 code points; blank or {@code null} is REQUIRED (it cannot be cleared). */
	private static String displayName(String raw, List<FieldProblem> problems) {
		OptionalInt forbidden = (raw != null) ? Names.firstForbidden(raw) : OptionalInt.empty();
		if (forbidden.isPresent()) {
			problems.add(new FieldProblem("displayName", ProblemCodes.INVALID_FORMAT,
					"Invisible or control character " + Names.codePoint(forbidden.getAsInt()) + " is not allowed"));
			return null;
		}
		String value = (raw != null) ? Names.strip(raw) : "";
		if (value.isEmpty()) {
			problems.add(new FieldProblem("displayName", ProblemCodes.REQUIRED, "Required"));
			return null;
		}
		if (value.codePointCount(0, value.length()) > DISPLAY_NAME_MAX) {
			problems.add(new FieldProblem("displayName", ProblemCodes.TOO_LONG, "At most " + DISPLAY_NAME_MAX + " characters"));
			return null;
		}
		return value;
	}

	/**
	 * {@code PATCH /tutor/settings}: each property is {@code null} while absent (unchanged) and an {@link Optional} once
	 * present, empty for a JSON {@code null}.
	 */
	public record WorkspaceCommand(Long version, Optional<String> displayName, Optional<String> defaultLocale,
			Optional<String> defaultTimeZone) {

		boolean isEmpty() {
			return displayName == null && defaultLocale == null && defaultTimeZone == null;
		}

	}

	public record WorkspaceView(String displayName, String defaultLocale, String defaultTimeZone, long version,
			Instant updatedAt) {
	}

}
