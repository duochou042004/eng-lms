package com.englms.identity.events;

/** Where a request came from: the client IP (as Tomcat resolved it) and the {@code User-Agent}; both may be null. */
public record ClientInfo(String ip, String userAgent) {

	public static final ClientInfo NONE = new ClientInfo(null, null);

}
