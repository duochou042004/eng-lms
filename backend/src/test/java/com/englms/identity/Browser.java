package com.englms.identity;

import java.io.IOException;
import java.net.HttpCookie;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse.BodyHandlers;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * A minimal browser for real-port API tests: a cookie jar (Secure cookies are sent over http://localhost, as
 * browsers do for localhost), the SPA's CSRF handshake ({@code XSRF-TOKEN} cookie → {@code X-XSRF-TOKEN} header) and
 * access to the raw {@code Set-Cookie} headers for flag assertions.
 */
public final class Browser {

	public static final String SESSION = "ENGLMS_SESSION";

	public static final String REMEMBER_ME = "ENGLMS_REMEMBER_ME";

	public static final String XSRF = "XSRF-TOKEN";

	private static final HttpClient HTTP = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build();

	private static final JsonMapper JSON = JsonMapper.shared();

	private final String base;

	public final Map<String, String> cookies = new LinkedHashMap<>();

	public String accept = "application/json";

	public Browser(int port) {
		this.base = "http://localhost:" + port;
	}

	public Response get(String path) {
		return send("GET", path, null, false);
	}

	/** A state-changing request with the CSRF header (after priming the token if needed). */
	public Response post(String path, String json) {
		return send("POST", path, json, true);
	}

	public Response send(String method, String path, String json, boolean withCsrf) {
		if (withCsrf && !cookies.containsKey(XSRF)) {
			get("/api/v1/auth/session");
		}
		return send(method, path, json, withCsrf ? cookies.get(XSRF) : null);
	}

	/** Sends {@code csrfHeader} (may be null) as {@code X-XSRF-TOKEN}, whatever the cookie says. */
	public Response send(String method, String path, String json, String csrfHeader) {
		HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(base + path))
			.method(method, (json != null) ? BodyPublishers.ofString(json) : BodyPublishers.noBody())
			.header("Accept", accept)
			.header("User-Agent", "englms-it-browser");
		if (json != null) {
			request.header("Content-Type", "application/json");
		}
		if (csrfHeader != null) {
			request.header("X-XSRF-TOKEN", csrfHeader);
		}
		if (!cookies.isEmpty()) {
			request.header("Cookie", String.join("; ", cookies.entrySet().stream().map(e -> e.getKey() + "=" + e.getValue()).toList()));
		}
		try {
			var response = HTTP.send(request.build(), BodyHandlers.ofString());
			List<String> setCookies = response.headers().allValues("set-cookie");
			for (String header : setCookies) {
				for (HttpCookie cookie : HttpCookie.parse(header)) {
					if (cookie.getMaxAge() == 0 || cookie.getValue().isEmpty()) {
						cookies.remove(cookie.getName());
					}
					else {
						cookies.put(cookie.getName(), cookie.getValue());
					}
				}
			}
			return new Response(response.statusCode(), response.headers().map(), response.body(), setCookies);
		}
		catch (IOException ex) {
			throw new IllegalStateException(ex);
		}
		catch (InterruptedException ex) {
			Thread.currentThread().interrupt();
			throw new IllegalStateException(ex);
		}
	}

	public Response login(String username, String password, boolean rememberMe) {
		return post("/api/v1/auth/login", "{\"username\":" + quote(username) + ",\"password\":" + quote(password)
				+ ",\"rememberMe\":" + rememberMe + "}");
	}

	/** The server-side session ID behind the {@code ENGLMS_SESSION} cookie (Spring Session base64-encodes it). */
	public String sessionId() {
		String cookie = cookies.get(SESSION);
		return (cookie != null) ? new String(Base64.getDecoder().decode(cookie)) : null;
	}

	public static String quote(String value) {
		return JSON.writeValueAsString(value);
	}

	public record Response(int status, Map<String, List<String>> headers, String body, List<String> setCookies) {

		public JsonNode json() {
			return JSON.readTree(body);
		}

		public String code() {
			return json().path("code").asString();
		}

		public String header(String name) {
			return headers.entrySet()
				.stream()
				.filter(e -> e.getKey().equalsIgnoreCase(name))
				.flatMap(e -> e.getValue().stream())
				.findFirst()
				.orElse(null);
		}

		public String setCookie(String name) {
			return setCookies.stream().filter(c -> c.startsWith(name + "=")).reduce((a, b) -> b).orElse(null);
		}

		/** The body without the per-request {@code requestId} and {@code instance}, to compare "the same body". */
		public String bodyWithoutRequestId() {
			var node = (tools.jackson.databind.node.ObjectNode) json();
			node.remove("requestId");
			return node.toString();
		}

	}

}
