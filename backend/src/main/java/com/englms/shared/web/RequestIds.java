package com.englms.shared.web;

/**
 * Names shared by the request-ID filter, the logs (MDC) and Problem Details responses.
 */
public final class RequestIds {

	public static final String HEADER = "X-Request-Id";

	public static final String MDC_KEY = "requestId";

	public static final String ATTRIBUTE = RequestIds.class.getName() + ".requestId";

	private RequestIds() {
	}

}
