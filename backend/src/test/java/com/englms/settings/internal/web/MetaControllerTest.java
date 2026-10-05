package com.englms.settings.internal.web;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import com.englms.TestcontainersConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.client.RestTestClient;

/**
 * AC5: {@code GET /api/v1/meta} and Problem Details for unknown API paths. Since T-M2.1 the whole application
 * context runs (Spring Security's filter chain is part of every response, DEC-054), so this is no longer a
 * {@code @WebMvcTest} slice. {@code /meta} stays public; the unknown-path cases run as a signed-in user, because an
 * anonymous caller now gets 401 on any {@code /api/**} path without a public handler (T-M2.1 AC9).
 */
@Tag("container")
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class MetaControllerTest {

	@Autowired
	MockMvc mockMvc;

	RestTestClient client;

	@BeforeEach
	void setUp() {
		client = RestTestClient.bindTo(mockMvc).build();
	}

	@Test
	void returnsWorkspaceMetadata() {
		client.get()
			.uri("/api/v1/meta")
			.exchange()
			.expectStatus()
			.isOk()
			.expectHeader()
			.contentTypeCompatibleWith(MediaType.APPLICATION_JSON)
			.expectHeader()
			.exists("X-Request-Id")
			.expectBody()
			.jsonPath("$.name").isEqualTo("englms")
			.jsonPath("$.version").isNotEmpty()
			.jsonPath("$.locales").isArray()
			.jsonPath("$.locales[0]").isEqualTo("vi")
			.jsonPath("$.locales[1]").isEqualTo("en")
			.jsonPath("$.displayName").isEqualTo("Eng-LMS")
			.jsonPath("$.length()").isEqualTo(4);
	}

	@Test
	@WithMockUser
	void unknownApiPathIsProblemDetailsWithCodeAndRequestId() {
		client.get()
			.uri("/api/v1/x")
			.exchange()
			.expectStatus()
			.isNotFound()
			.expectHeader()
			.contentType(MediaType.APPLICATION_PROBLEM_JSON)
			.expectBody()
			.jsonPath("$.status").isEqualTo(404)
			.jsonPath("$.code").isEqualTo("NOT_FOUND")
			.jsonPath("$.type").isEqualTo("https://englms.local/problems/not-found")
			.jsonPath("$.instance").isEqualTo("/api/v1/x")
			.jsonPath("$.requestId").isNotEmpty()
			.jsonPath("$.detail").doesNotExist();
	}

	@Test
	@WithMockUser
	void wrongMethodIsProblemDetails() {
		client.post()
			.uri("/api/v1/meta")
			// A valid CSRF pair (T-M2.1): without it the CSRF filter answers 403 before the handler lookup.
			.cookie("XSRF-TOKEN", "t")
			.header("X-XSRF-TOKEN", "t")
			.exchange()
			.expectStatus()
			.isEqualTo(405)
			.expectBody()
			.jsonPath("$.code").isEqualTo("METHOD_NOT_ALLOWED");
	}

	@Test
	@WithMockUser
	void wellFormedIncomingRequestIdIsEchoedEverywhere() {
		client.get()
			.uri("/api/v1/x")
			.header("X-Request-Id", "abc-123")
			.exchange()
			.expectHeader()
			.valueEquals("X-Request-Id", "abc-123")
			.expectBody()
			.jsonPath("$.requestId").isEqualTo("abc-123");
	}

	@Test
	void malformedIncomingRequestIdIsReplaced() {
		client.get()
			.uri("/api/v1/meta")
			.header("X-Request-Id", "bad id\" injected")
			.exchange()
			.expectHeader()
			.value("X-Request-Id", id -> org.assertj.core.api.Assertions.assertThat(id).matches("[0-9a-f-]{36}"));
	}

}
