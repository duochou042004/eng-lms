package com.englms;

import static org.assertj.core.api.Assertions.assertThat;

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
