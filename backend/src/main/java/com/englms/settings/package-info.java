/**
 * Workspace settings. In M1 it only serves the public workspace metadata ({@code GET /api/v1/meta}); the typed
 * settings store arrives with its milestone (module-boundaries.md).
 */
@ApplicationModule(displayName = "Settings", allowedDependencies = "shared")
package com.englms.settings;

import org.springframework.modulith.ApplicationModule;
