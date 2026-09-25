package com.englms.shared;

/**
 * The closed set of stable error codes carried in the {@code code} property of every Problem Details response
 * (api-conventions.md §5). The frontend maps these codes to i18n messages. New codes arrive with the packets that need them.
 */
public enum ProblemCodes {

	MALFORMED_REQUEST,
	NOT_FOUND,
	METHOD_NOT_ALLOWED,
	UNSUPPORTED_MEDIA_TYPE,
	NOT_ACCEPTABLE,
	VALIDATION_FAILED,
	INTERNAL_ERROR

}
