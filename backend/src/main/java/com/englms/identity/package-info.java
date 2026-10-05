/**
 * Identity: accounts, the single tutor, sign-in, sessions and passwords (module-boundaries.md, ADR-0005).
 * Public API: {@link com.englms.identity.AccountApi}, {@link com.englms.identity.CurrentUser},
 * {@link com.englms.identity.SessionTerminator}, {@link com.englms.identity.Usernames}; events in
 * {@code identity.events}, which the audit module records. Identity never calls the audit module.
 */
@ApplicationModule(displayName = "Identity", allowedDependencies = "shared")
package com.englms.identity;

import org.springframework.modulith.ApplicationModule;
