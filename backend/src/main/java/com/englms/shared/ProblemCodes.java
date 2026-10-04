package com.englms.shared;

/**
 * The closed set of stable error codes carried in the {@code code} property of every Problem Details response, and in
 * the {@code code} of its {@code errors[]} entries (api-conventions.md §5). The frontend maps these codes to i18n
 * messages. New codes arrive with the packets that need them.
 */
public enum ProblemCodes {

	MALFORMED_REQUEST,
	NOT_FOUND,
	METHOD_NOT_ALLOWED,
	UNSUPPORTED_MEDIA_TYPE,
	NOT_ACCEPTABLE,
	VALIDATION_FAILED,
	INTERNAL_ERROR,

	// T-M2.1: authentication and the URL gate (security.md §3, §4).
	UNAUTHENTICATED,
	SESSION_EXPIRED,
	FORBIDDEN_ROLE,
	PASSWORD_CHANGE_REQUIRED,
	CSRF_INVALID,
	RATE_LIMITED,

	// T-M2.1: field codes of errors[] for passwords (NFR-SEC-06, validation-rules.md).
	PASSWORD_TOO_SHORT,
	PASSWORD_TOO_LONG,
	PASSWORD_TOO_COMMON,
	PASSWORD_EQUALS_USERNAME,
	PASSWORD_UNCHANGED,
	CURRENT_PASSWORD_INCORRECT

}
