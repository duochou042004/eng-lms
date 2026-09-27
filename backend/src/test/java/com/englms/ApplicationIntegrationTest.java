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

	@Test
	void unknownApiPathIsProblemDetailsNotTheSpa() {
		api.get()
			.uri("/api/v1/x")
			.header("Accept", "text/html,*/*;q=0.8")
			.exchange()
			.expectStatus()
			.isNotFound()
			.expectHeader()
			.contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
			.expectHeader()
			.valueEquals("Content-Security-Policy", CSP)
			.expectBody()
			.jsonPath("$.code")
			.isEqualTo("NOT_FOUND");
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

	@Test
	void aRejectedRequestReusesAValidIncomingRequestIdAndNeverEchoesABadOne() throws IOException {
		assertThat(rawGet(port, "/api/v1/a%2fb", "it-rejected-1").header("x-request-id")).isEqualTo("it-rejected-1");
		RawResponse bad = rawGet(port, "/api/v1/a%2fb", "bad<id>");
		assertThat(bad.header("x-request-id")).matches("[0-9a-f-]{36}");
		assertThat(bad.body()).doesNotContain("bad");
	}

	record RawResponse(int status, Map<String, String> headers, String body) {

		String header(String name) {
			return headers.get(name);
		}

	}

	/** A raw HTTP/1.1 GET: HTTP clients refuse to send an unencoded {@code <}, Tomcat's parser is what is tested. */
	static RawResponse rawGet(int port, String target, String requestId) throws IOException {
		try (Socket socket = new Socket("localhost", port)) {
			socket.setSoTimeout(10_000);
			OutputStream out = socket.getOutputStream();
			String request = "GET " + target + " HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n"
					+ ((requestId != null) ? "X-Request-Id: " + requestId + "\r\n" : "") + "\r\n";
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
