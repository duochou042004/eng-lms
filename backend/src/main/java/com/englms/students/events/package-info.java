/**
 * Students events (module-boundaries.md). Published inside the command's transaction; the audit module records them
 * after commit, so a rolled-back command leaves no audit row. They carry IDs and status names only, no personal data.
 */
@NamedInterface("events")
package com.englms.students.events;

import org.springframework.modulith.NamedInterface;
