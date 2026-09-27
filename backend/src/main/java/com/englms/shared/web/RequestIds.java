package com.englms.shared.web;

import java.util.regex.Pattern;

import com.englms.shared.Ids;

/**
 * Names shared by the request-ID filter, the logs (MDC) and Problem Details responses.
 */
public final class RequestIds {

	public static final String HEADER = "X-Request-Id";

	public static final String MDC_KEY = "requestId";

	public static final String ATTRIBUTE = RequestIds.class.getName() + ".requestId";

	private static final Pattern SAFE_ID = Pattern.compile("[A-Za-z0-9._-]{1,64}");

	private RequestIds() {
	}

	/**
	 * The request ID to use: a well-formed incoming {@code X-Request-Id} is reused, anything else gets a new ID.
	 */
	static String resolve(String incoming, Ids ids) {
		return (incoming != null && SAFE_ID.matcher(incoming).matches()) ? incoming : ids.newId().toString();
	}

}
