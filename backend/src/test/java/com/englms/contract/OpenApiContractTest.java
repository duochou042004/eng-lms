package com.englms.contract;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.fail;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import com.englms.TestcontainersConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.client.RestTestClient;

/**
 * AC7: the generated OpenAPI document must equal the committed contract {@code api/openapi.json} (ADR-0014).
 * Regenerate it deliberately with {@code ./mvnw test -Dtest=OpenApiContractTest -Dcontract.write=true}.
 */
@Tag("container")
@SpringBootTest(properties = "springdoc.api-docs.enabled=true")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class OpenApiContractTest {

	static final Path CONTRACT = Path.of("..", "api", "openapi.json");

	@Autowired
	MockMvc mockMvc;

	@Test
	void generatedDocumentMatchesTheCommittedContract() throws IOException {
		String generated = RestTestClient.bindTo(mockMvc)
			.build()
			.get()
			.uri("/v3/api-docs")
			// Without an explicit Accept header the SPA fallback (T-M1.5) would treat this extension-less path as a
			// client route; springdoc is off at runtime, so only this test ever asks for it.
			.header("Accept", "application/json")
			.exchange()
			.expectStatus()
			.isOk()
			.expectBody(String.class)
			.returnResult()
			.getResponseBody();
		String normalized = generated.replace("\r\n", "\n").strip() + "\n";

		if (Boolean.getBoolean("contract.write")) {
			Files.writeString(CONTRACT, normalized, StandardCharsets.UTF_8);
			return;
		}
		if (!Files.exists(CONTRACT)) {
			fail(CONTRACT + " is missing: run ./mvnw test -Dtest=OpenApiContractTest -Dcontract.write=true");
		}
		assertThat(normalized)
			.as("API contract drift: review the change, then regenerate api/openapi.json with -Dcontract.write=true")
			.isEqualTo(Files.readString(CONTRACT, StandardCharsets.UTF_8));
	}

}
