package com.englms.shared.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.head;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import com.englms.TestcontainersConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.springframework.test.web.servlet.client.RestTestClient.ResponseSpec;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * T-M1.5 AC2/AC3: SPA fallback, cache headers and the security.md §5 headers. The SPA fixture lives in
 * {@code src/test/resources/static/}; the real {@code web/dist} is only copied in by the image build. MockMvc does not
 * execute forwards, so the served {@code index.html} of a client route is checked on the real server
 * (ApplicationIntegrationTest).
 * <p>
 * Since T-M2.1 the headers come from Spring Security's filter chain (DEC-054), so the whole application context runs
 * (no longer a {@code @WebMvcTest} slice). {@code /api/**} paths are requested as a signed-in tutor: an anonymous
 * caller now gets 401 there (T-M2.1 AC9, covered by AuthApiIntegrationTest). Unsafe methods carry a valid CSRF pair.
 */
@Tag("container")
@SpringBootTest
@AutoConfigureMockMvc
@Import({ TestcontainersConfiguration.class, SpaServingTest.ProbeController.class })
class SpaServingTest {

	/** Written out literally (not the filter's constant) so a policy change must also change this test. */
	static final String CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; "
			+ "media-src 'self' blob:; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; "
			+ "base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

	static final String HTML_NAVIGATION = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

	@Autowired
	MockMvc mockMvc;

	RestTestClient client;

	@BeforeEach
	void setUp() {
		client = RestTestClient.bindTo(mockMvc).build();
	}

	@ParameterizedTest
	@ValueSource(strings = { "/", "/tutor", "/student/x", "/tutor/students/01J/" })
	void clientRoutesAndTheRootForwardToIndexHtml(String path) throws Exception {
		mockMvc.perform(get(path).header("Accept", HTML_NAVIGATION))
			.andExpect(status().isOk())
			.andExpect(forwardedUrl("/index.html"))
			.andExpect(header().string("Content-Security-Policy", CSP));
	}

	@Test
	void fallsBackWithoutAnAcceptHeaderAndForHead() throws Exception {
		mockMvc.perform(get("/tutor")).andExpect(forwardedUrl("/index.html"));
		mockMvc.perform(head("/tutor").header("Accept", HTML_NAVIGATION)).andExpect(forwardedUrl("/index.html"));
	}

	@Test
	void indexHtmlIsServedWithNoCache() {
		expectSecurityHeaders(client.get().uri("/index.html").header("Accept", HTML_NAVIGATION).exchange())
			.expectStatus()
			.isOk()
			.expectHeader()
			.contentTypeCompatibleWith(MediaType.TEXT_HTML)
			.expectHeader()
			.valueEquals("Cache-Control", "no-cache")
			.expectBody(String.class)
			.value(body -> assertThat(body).contains("Eng-LMS test SPA"));
	}

	@Test
	@WithMockUser(roles = "TUTOR")
	void apiHandlersAreUnaffected() {
		expectSecurityHeaders(client.get().uri("/api/v1/tutor/probe").header("Accept", HTML_NAVIGATION).exchange())
			.expectStatus()
			.isOk()
			.expectBody(String.class)
			.isEqualTo("probe");
	}

	@Test
	void hashedAssetsAreImmutable() {
		expectSecurityHeaders(client.get().uri("/assets/index-Ab12Cd34.js").exchange()).expectStatus()
			.isOk()
			.expectHeader()
			.valueEquals("Cache-Control", "max-age=31536000, public, immutable");
	}

	@Test
	void otherStaticFilesRevalidate() {
		client.get().uri("/favicon.svg").exchange().expectStatus().isOk().expectHeader().valueEquals("Cache-Control", "no-cache");
	}

	@ParameterizedTest
	@WithMockUser(roles = "TUTOR")
	@ValueSource(strings = { "/api", "/api/v1/x", "/api/v1/tutor/students", "/actuator/health",
			"/actuator", "/assets/missing-00000000.js", "/assets/tutor" })
	void apiActuatorAndAssetPathsNeverFallBack(String path) {
		expectSecurityHeaders(client.get().uri(path).header("Accept", HTML_NAVIGATION).exchange()).expectStatus()
			.isNotFound()
			.expectHeader()
			.contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
			.expectBody()
			.jsonPath("$.code")
			.isEqualTo("NOT_FOUND");
	}

	/**
	 * Path parameters on {@code /api}: since T-M2.1 Spring Security's firewall rejects the semicolon (400 Problem
	 * Details with the security headers) before the SPA fallback could see it, which still means "never the shell".
	 */
	@Test
	void apiWithPathParametersIsRejectedNotTheShell() {
		expectSecurityHeaders(client.get().uri("/api;x=1/v1/x").header("Accept", HTML_NAVIGATION).exchange()).expectStatus()
			.isBadRequest()
			.expectHeader()
			.contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
			.expectBody()
			.jsonPath("$.code")
			.isEqualTo("MALFORMED_REQUEST");
	}

	@ParameterizedTest
	@ValueSource(strings = { "application/json", "image/avif,image/webp", "text/html;q=0" })
	void nonHtmlRequestsForClientRoutesAreNotFound(String accept) {
		client.get().uri("/tutor").header("Accept", accept).exchange().expectStatus().isNotFound();
	}

	@Test
	void missingFilesWithAnExtensionAreNotFound() {
		client.get().uri("/robots.txt").header("Accept", HTML_NAVIGATION).exchange().expectStatus().isNotFound();
	}

	@ParameterizedTest
	@ValueSource(strings = { "POST", "PUT", "DELETE", "PATCH" })
	void onlyGetAndHeadFallBack(String method) {
		client.method(HttpMethod.valueOf(method))
			.uri("/tutor")
			.header("Accept", HTML_NAVIGATION)
			.cookie("XSRF-TOKEN", "t")
			.header("X-XSRF-TOKEN", "t")
			.exchange()
			.expectStatus()
			.value(status -> assertThat(status).isIn(404, 405));
	}

	@RestController
	static class ProbeController {

		@GetMapping("/api/v1/tutor/probe")
		@Audience(Audience.Kind.TUTOR)
		String probe() {
			return "probe";
		}

	}

	static ResponseSpec expectSecurityHeaders(ResponseSpec response) {
		return response.expectHeader()
			.valueEquals("Content-Security-Policy", CSP)
			.expectHeader()
			.valueEquals("X-Content-Type-Options", "nosniff")
			.expectHeader()
			.valueEquals("Referrer-Policy", "strict-origin-when-cross-origin")
			.expectHeader()
			.valueEquals("Permissions-Policy", "microphone=(self), camera=(), geolocation=(), payment=()")
			.expectHeader()
			.valueEquals("Cross-Origin-Opener-Policy", "same-origin");
	}

}
