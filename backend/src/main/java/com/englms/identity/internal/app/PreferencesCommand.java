package com.englms.identity.internal.app;

import java.util.Optional;

/**
 * {@code PATCH /api/v1/auth/preferences} (FR-SET-02): each property is {@code null} while absent (unchanged) and an
 * {@link Optional} once present, empty for a JSON {@code null}.
 */
public record PreferencesCommand(Optional<String> locale, Optional<String> timeZone, Optional<String> displayName) {

	public boolean isEmpty() {
		return locale == null && timeZone == null && displayName == null;
	}

}
