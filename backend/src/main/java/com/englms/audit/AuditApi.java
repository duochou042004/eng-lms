package com.englms.audit;

/** Writes audit events, each in its own transaction, so the row survives a request that fails afterwards. */
public interface AuditApi {

	void record(AuditEntry entry);

}
