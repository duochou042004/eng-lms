package com.englms.settings;

import com.englms.security.IsolationWorld;
import com.englms.security.IsolationWorldContributor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * The settings part of the isolation world (T-M2.35): no rows of its own, but each fresh world starts from the seeded
 * workspace document (version 0), so the {@code PATCH /tutor/settings} matrix sample is never stale.
 */
@Component
public class SettingsWorldContributor implements IsolationWorldContributor {

	private final JdbcTemplate jdbc;

	public SettingsWorldContributor(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	@Override
	public void contribute(IsolationWorld world) {
	}

	@Override
	public void reset() {
		resetWorkspace(jdbc);
	}

	/** Puts the {@code workspace} row back to the migration's seed (V202611250001). */
	public static void resetWorkspace(JdbcTemplate jdbc) {
		jdbc.update("""
				UPDATE workspace_setting SET value = '{"defaultLocale": "vi", "defaultTimeZone": "Asia/Ho_Chi_Minh"}',
				    version = 0, updated_at = now(), updated_by = NULL WHERE key = 'workspace'""");
	}

}
