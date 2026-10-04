package com.englms.audit;

import java.util.Map;
import java.util.UUID;

/**
 * One audit event. {@code details} must never contain a password, hash, token or session ID (NFR-SEC-11).
 * Every field except {@code action} and {@code details} may be null.
 */
public record AuditEntry(AuditAction action, UUID actorUserId, String subjectType, UUID subjectId, String ip,
		String userAgent, Map<String, String> details) {

	public AuditEntry {
		details = Map.copyOf(details);
	}

}
