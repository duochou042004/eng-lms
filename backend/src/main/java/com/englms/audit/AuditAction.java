package com.englms.audit;

/** The recorded actions (security.md §8). Values are added by the packets that emit them. */
public enum AuditAction {

	LOGIN_SUCCEEDED, LOGIN_FAILED, ACCOUNT_LOCKED, PASSWORD_CHANGED, PASSWORD_RESET_BY_TUTOR, PASSWORD_RESET_BY_OPERATOR,
	BOOTSTRAP_TUTOR_CREATED

}
