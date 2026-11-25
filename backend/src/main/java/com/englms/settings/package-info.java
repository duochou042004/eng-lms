/**
 * Workspace settings: the public workspace metadata ({@code GET /api/v1/meta}) and, since T-M2.35, the workspace
 * settings store ({@code workspace_setting}, {@code GET/PATCH /api/v1/tutor/settings}). Public API:
 * {@link com.englms.settings.SettingsApi} (module-boundaries.md).
 */
@ApplicationModule(displayName = "Settings", allowedDependencies = "shared")
package com.englms.settings;

import org.springframework.modulith.ApplicationModule;
