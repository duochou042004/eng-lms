/**
 * Identity events (module-boundaries.md). Published synchronously; the audit module records them in its own
 * transaction, so a failed-login row survives the failed request (T-M2.1). They never carry a password, hash,
 * token or session ID.
 */
@NamedInterface("events")
package com.englms.identity.events;

import org.springframework.modulith.NamedInterface;
