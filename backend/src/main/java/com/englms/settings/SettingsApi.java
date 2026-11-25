package com.englms.settings;

/**
 * The settings module's public API (module-boundaries.md §settings). As built (T-M2.35): the workspace defaults a new
 * account starts with; the generic typed {@code get(Key<T>)} waits for a second caller.
 */
public interface SettingsApi {

	/** The workspace's default language and time zone (FR-SET-01); read in the caller's transaction. */
	AccountDefaults accountDefaults();

	record AccountDefaults(String locale, String timeZone) {
	}

}
