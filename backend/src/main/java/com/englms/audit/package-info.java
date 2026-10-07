/**
 * Audit log v1 (NFR-SEC-11, security.md §8): the append-only {@code audit_event} table, {@link com.englms.audit.AuditApi}
 * and the 365-day retention. It records the identity and students modules' events; neither calls it (no
 * {@code identity → audit} or {@code students → audit} dependency, module-boundaries.md).
 */
@ApplicationModule(displayName = "Audit", allowedDependencies = { "shared", "identity :: events", "students :: events" })
package com.englms.audit;

import org.springframework.modulith.ApplicationModule;
