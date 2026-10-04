package com.englms;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.test.web.server.LocalManagementPort;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;

import tools.jackson.databind.json.JsonMapper;

/**
 * AC5 and AC8 on the real server: the API port serves the API only, Actuator is on the management port with
 * {@code health} and {@code info} only, and the logs are JSON lines carrying the request ID. T-M1.5: the SPA
 * fallback, cache headers and security headers on the real server (MockMvc cannot follow the forward).
 */
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT, properties = "management.server.port=0")
@Import(TestcontainersConfiguration.class)
@ExtendWith(OutputCaptureExtension.class)
class ApplicationIntegrationTest {

	static final String CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; "
			+ "media-src 'self' blob:; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; "
			+ "base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

	@LocalServerPort
	int port;

	@LocalManagementPort
	int managementPort;

	RestTestClient api;

	RestTestClient management;

	@BeforeEach
	void setUp() {
		api = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
		management = RestTestClient.bindToServer().baseUrl("http://localhost:" + managementPort).build();
	}

	@Test
	void usesASeparateManagementPort() {
		assertThat(managementPort).isNotEqualTo(port);
	}

	@Test
	void metaIsServedOnTheApiPort() {
		api.get().uri("/api/v1/meta").exchange().expectStatus().isOk().expectBody().jsonPath("$.locales[0]").isEqualTo("vi");
	}

	@ParameterizedTest
	@ValueSource(strings = { "/actuator/health", "/actuator/health/liveness", "/actuator/health/readiness",
			"/actuator/info" })
	void exposesHealthAndInfoOnTheManagementPort(String path) {
		management.get().uri(path).exchange().expectStatus().isOk();
	}

	@ParameterizedTest
	@ValueSource(strings = { "/actuator/env", "/actuator/beans", "/actuator/configprops", "/actuator/modulith",
			"/actuator/metrics", "/actuator/loggers", "/actuator/heapdump" })
	void exposesNothingElseOnTheManagementPort(String path) {
		management.get().uri(path).exchange().expectStatus().isNotFound();
	}

	@ParameterizedTest
	@ValueSource(strings = { "/actuator/health", "/actuator/info" })
	void actuatorIsNotReachableOnTheApiPort(String path) {
		api.get().uri(path).exchange().expectStatus().isNotFound();
	}

	@ParameterizedTest
	@ValueSource(strings = { "/", "/tutor", "/student/x" })
	void clientRoutesServeTheSpaIndexWithNoCacheAndTheSecurityHeaders(String path) {
		api.get()
			.uri(path)
			.header("Accept", "text/html,application/xhtml+xml,*/*;q=0.8")
			.exchange()
			.expectStatus()
			.isOk()
			.expectHeader()
			.contentTypeCompatibleWith(MediaType.TEXT_HTML)
			.expectHeader()
			.valueEquals("Cache-Control", "no-cache")
			.expectHeader()
			.valueEquals("Content-Security-Policy", CSP)
			.expectHeader()
			.valueEquals("X-Content-Type-Options", "nosniff")
			.expectBody(String.class)
			.value(body -> assertThat(body).contains("Eng-LMS test SPA"));
	}

	@Test
	void hashedAssetsAreImmutableOnTheRealServer() {
		api.get()
			.uri("/assets/index-Ab12Cd34.js")
			.exchange()
			.expectStatus()
			.isOk()
			.expectHeader()
			.valueEquals("Cache-Control", "max-age=31536000, public, immutable");
	}

	// T-M2.1 AC9: an anonymous caller gets 401 on any /api/** path without a public handler (the authenticated 404 is
	// AuthApiIntegrationTest's); still Problem Details with the headers, never the SPA.
	@Test
	void unknownApiPathIsProblemDetailsNotTheSpa() {
		api.get()
			.uri("/api/v1/x")
			.header("Accept", "text/html,*/*;q=0.8")
			.exchange()
			.expectStatus()
			.isUnauthorized()
			.expectHeader()
			.contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
			.expectHeader()
			.valueEquals("Content-Security-Policy", CSP)
			.expectHeader()
			.valueEquals("Cache-Control", "no-store")
			.expectBody()
			.jsonPath("$.code")
			.isEqualTo("UNAUTHENTICATED");
	}

	// T-M2.1 AC10: the headers come from Spring Security, with the same values on API JSON as everywhere else.
	@Test
	void apiJsonCarriesTheSecurityHeadersAndNoStore() {
		api.get()
			.uri("/api/v1/meta")
			.exchange()
			.expectStatus()
			.isOk()
			.expectHeader()
			.valueEquals("Content-Security-Policy", CSP)
			.expectHeader()
			.valueEquals("X-Content-Type-Options", "nosniff")
			.expectHeader()
			.valueEquals("Referrer-Policy", "strict-origin-when-cross-origin")
			.expectHeader()
			.valueEquals("Permissions-Policy", "microphone=(self), camera=(), geolocation=(), payment=()")
			.expectHeader()
			.valueEquals("Cross-Origin-Opener-Policy", "same-origin")
			.expectHeader()
			.valueEquals("Cache-Control", "no-store")
			.expectHeader()
			.doesNotExist("X-Frame-Options");
	}

	// T-M2.1 AC10 (DEC-054, T-M1.5 QA F3): raw dot-segments are rejected by the firewall, not answered with the shell.
	@ParameterizedTest
	@ValueSource(strings = { "/./api/v1/meta", "/x/../actuator/health", "/./tutor", "/api/v1/../v1/meta" })
	void rawDotSegmentPathsAreRejectedWithProblemDetails(String target) throws IOException {
		RawResponse response = raw(port, "GET " + target + " HTTP/1.1", "Accept: text/html\r\n");

		assertThat(response.status()).isEqualTo(400);
		assertRejectedProblem(response, 400, "MALFORMED_REQUEST");
	}

	// T-M2.1 AC10 (DEC-069, T-M1.8 SEC S4-3): TRACE no longer reaches Boot's /error page.
	@ParameterizedTest
	@ValueSource(strings = { "/", "/api/v1/meta" })
	void traceIsRefusedWithProblemDetailsAndTheHeaders(String target) throws IOException {
		for (String accept : new String[] { "", "Accept: text/html\r\n" }) {
			RawResponse response = raw(port, "TRACE " + target + " HTTP/1.1", accept + "X-Probe: reflected-value\r\n");

			assertThat(response.status()).isEqualTo(405);
			assertRejectedProblem(response, 405, "METHOD_NOT_ALLOWED");
			assertThat(response.body()).doesNotContain("reflected-value", "X-Probe", "Whitelabel", "TRACE");
		}
	}

	static void assertRejectedProblem(RawResponse response, int status, String code) {
		assertThat(response.header("content-type")).startsWith("application/problem+json");
		assertThat(response.header("cache-control")).isEqualTo("no-store");
		assertThat(response.header("content-security-policy")).isEqualTo(CSP);
		assertThat(response.header("x-content-type-options")).isEqualTo("nosniff");
		assertThat(response.header("referrer-policy")).isEqualTo("strict-origin-when-cross-origin");
		assertThat(response.header("permissions-policy")).isEqualTo("microphone=(self), camera=(), geolocation=(), payment=()");
		assertThat(response.header("cross-origin-opener-policy")).isEqualTo("same-origin");
		String requestId = response.header("x-request-id");
		assertThat(requestId).matches("[0-9a-f-]{36}");
		assertThat(response.body()).contains("\"status\":" + status, "\"code\":\"" + code + "\"",
				"\"requestId\":\"" + requestId + "\"");
		assertThat(response.body()).doesNotContain("<", "html", "instance", "meta", "actuator", "..");
	}

	// T-M1.8 AC1: the management port carries request IDs (only; no security headers there, DEC-050).
	@Test
	void managementProblemDetailsCarryTheRequestIdOfTheResponseHeader() {
		management.get()
			.uri("/actuator/env")
			.exchange()
			.expectStatus()
			.isNotFound()
			.expectHeader()
			.contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
			.expectHeader()
			.doesNotExist("Content-Security-Policy")
			.expectBody(String.class)
			.consumeWith(result -> {
				String header = result.getResponseHeaders().getFirst("X-Request-Id");
				assertThat(header).isNotBlank();
				assertThat(result.getResponseBody()).contains("\"requestId\":\"" + header + "\"");
			});
	}

	@Test
	void managementEchoesAValidIncomingRequestId() {
		management.get()
			.uri("/actuator/health")
			.header("X-Request-Id", "it-mgmt-1")
			.exchange()
			.expectStatus()
			.isOk()
			.expectHeader()
			.valueEquals("X-Request-Id", "it-mgmt-1");
	}

	@Test
	void managementHealthCarriesAGeneratedRequestId() {
		management.get()
			.uri("/actuator/health")
			.exchange()
			.expectStatus()
			.isOk()
			.expectHeader()
			.value("X-Request-Id", id -> assertThat(id).matches("[0-9a-f-]{36}"));
	}

	// T-M1.8 AC2: requests Tomcat rejects before any filter runs get Problem Details, the security headers and a request ID.
	@ParameterizedTest
	@ValueSource(strings = { "/api/v1/meta?q=<", "/api/v1/a%2fb", "/api/..%2fmeta" })
	void requestsRejectedByTomcatGetProblemDetailsAndTheSecurityHeaders(String target) throws IOException {
		RawResponse response = rawGet(port, target, null);

		assertThat(response.status()).isEqualTo(400);
		assertThat(response.header("content-type")).startsWith("application/problem+json");
		assertThat(response.header("cache-control")).isEqualTo("no-store");
		assertThat(response.header("content-security-policy")).isEqualTo(CSP);
		assertThat(response.header("x-content-type-options")).isEqualTo("nosniff");
		assertThat(response.header("referrer-policy")).isEqualTo("strict-origin-when-cross-origin");
		assertThat(response.header("permissions-policy")).isEqualTo("microphone=(self), camera=(), geolocation=(), payment=()");
		assertThat(response.header("cross-origin-opener-policy")).isEqualTo("same-origin");
		String requestId = response.header("x-request-id");
		assertThat(requestId).matches("[0-9a-f-]{36}");
		assertThat(response.body()).contains("\"status\":400", "\"code\":\"MALFORMED_REQUEST\"",
				"\"requestId\":\"" + requestId + "\"");
		assertThat(response.body()).doesNotContain("<", "html", "Tomcat", "Exception", "instance", "meta", "%2f");
	}

	// Deterministic: the generated ID is only checked for its UUIDv7 shape and equality; every banned string contains '<', which hex never does.
	@Test
	void aRejectedRequestReusesAValidIncomingRequestIdAndNeverEchoesABadOne() throws IOException {
		RawResponse valid = rawGet(port, "/api/v1/a%2fb", "it-rejected-1");
		assertThat(valid.header("x-request-id")).isEqualTo("it-rejected-1");
		assertThat(bodyRequestId(valid)).isEqualTo("it-rejected-1");

		RawResponse bad = rawGet(port, "/api/v1/a%2fb", "bad<id>");
		String requestId = bad.header("x-request-id");
		assertThat(requestId).matches("[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}");
		assertThat(UUID.fromString(requestId)).satisfies(uuid -> {
			assertThat(uuid.version()).isEqualTo(7);
			assertThat(uuid.variant()).isEqualTo(2);
		});
		assertThat(bodyRequestId(bad)).isEqualTo(requestId);
		assertThat(requestId).doesNotContain("bad<id>", "<");
		assertThat(bad.body()).doesNotContain("bad<id>", "<");
	}

	static String bodyRequestId(RawResponse response) {
		return JsonMapper.builder().build().readTree(response.body()).path("requestId").asString();
	}

	// SEC review S4-2: other statuses Tomcat answers itself. 4xx are client errors (MALFORMED_REQUEST), 5xx INTERNAL_ERROR.
	@Test
	void tomcatLevelClientErrorsOtherThan400AreMalformedRequests() throws IOException {
		RawResponse response = raw(port, "GET /api/v1/meta HTTP/1.1", "Expect: 200-foo\r\n");
		assertThat(response.status()).isEqualTo(417);
		assertThat(response.header("content-security-policy")).isEqualTo(CSP);
		assertThat(response.body()).contains("\"status\":417", "\"code\":\"MALFORMED_REQUEST\"");
	}

	@Test
	void tomcatLevelServerErrorsAreInternalErrorsWithTheHeaders() throws IOException {
		RawResponse response = raw(port, "GET /api/v1/meta HTTP/3.0", "");
		assertThat(response.status()).isEqualTo(505);
		assertThat(response.header("content-security-policy")).isEqualTo(CSP);
		assertThat(response.body()).contains("\"status\":505", "\"code\":\"INTERNAL_ERROR\"");
	}

	// SEC review S3-1: the management-context configuration must not leak into the application context. One request on
	// :8080 gives exactly one access-log line, and it carries the request ID (the request-ID filter runs once).
	@Test
	void anApplicationPortRequestIsLoggedOnceWithItsRequestId(CapturedOutput output) {
		String path = "/api/v1/single-log-" + java.util.UUID.randomUUID();
		// 401 since T-M2.1 (anonymous on /api/**); the point here is the single log line.
		api.get().uri(path).exchange().expectStatus().isUnauthorized();

		assertThat(output.getOut().lines().filter(line -> line.contains("GET " + path + " ->")))
			.singleElement()
			.asString()
			.contains("\"requestId\":\"");
	}

	record RawResponse(int status, Map<String, String> headers, String body) {

		String header(String name) {
			return headers.get(name);
		}

	}

	/** A raw HTTP/1.1 GET: HTTP clients refuse to send an unencoded {@code <}, Tomcat's parser is what is tested. */
	static RawResponse rawGet(int port, String target, String requestId) throws IOException {
		return raw(port, "GET " + target + " HTTP/1.1",
				(requestId != null) ? "X-Request-Id: " + requestId + "\r\n" : "");
	}

	/** A raw request: {@code requestLine}, then Host, Connection: close and {@code extraHeaders} (CRLF-terminated). */
	static RawResponse raw(int port, String requestLine, String extraHeaders) throws IOException {
		try (Socket socket = new Socket("localhost", port)) {
			socket.setSoTimeout(10_000);
			OutputStream out = socket.getOutputStream();
			String request = requestLine + "\r\nHost: localhost\r\nConnection: close\r\n" + extraHeaders + "\r\n";
			out.write(request.getBytes(StandardCharsets.ISO_8859_1));
			out.flush();
			InputStream in = socket.getInputStream();
			String raw = new String(in.readAllBytes(), StandardCharsets.UTF_8);
			int split = raw.indexOf("\r\n\r\n");
			String[] head = raw.substring(0, split).split("\r\n");
			Map<String, String> headers = new LinkedHashMap<>();
			for (int i = 1; i < head.length; i++) {
				int colon = head[i].indexOf(':');
				headers.put(head[i].substring(0, colon).trim().toLowerCase(Locale.ROOT), head[i].substring(colon + 1).trim());
			}
			return new RawResponse(Integer.parseInt(head[0].split(" ")[1]), headers, raw.substring(split + 4));
		}
	}

	@Test
	void logsAreJsonLinesWithTheRequestId(CapturedOutput output) {
		api.get().uri("/api/v1/meta").header("X-Request-Id", "it-log-check-1").exchange().expectStatus().isOk();

		assertThat(output.getOut().lines().filter(line -> line.contains("it-log-check-1")))
			.isNotEmpty()
			.allSatisfy(line -> assertThat(line).startsWith("{")
				.endsWith("}")
				.contains("\"requestId\":\"it-log-check-1\""));
	}

}
