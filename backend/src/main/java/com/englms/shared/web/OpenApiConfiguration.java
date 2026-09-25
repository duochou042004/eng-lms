package com.englms.shared.web;

import java.util.Arrays;
import java.util.List;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.IntegerSchema;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.servers.Server;

import com.englms.shared.ProblemCodes;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The OpenAPI document is the API contract (ADR-0014), committed as {@code api/openapi.json}. It is kept free of
 * build- or host-specific values so that it is deterministic. The {@link ProblemCodes} enum is exported for clients.
 */
@Configuration(proxyBeanMethods = false)
class OpenApiConfiguration {

	@Bean
	OpenAPI englmsOpenApi() {
		return new OpenAPI().info(new Info().title("Eng-LMS API").version("v1"))
			.servers(List.of(new Server().url("/").description("Same origin")));
	}

	@Bean
	OpenApiCustomizer problemSchemas() {
		return openApi -> {
			StringSchema code = new StringSchema();
			code.setEnum(Arrays.stream(ProblemCodes.values()).map(Enum::name).toList());
			Schema<?> problem = new ObjectSchema().required(List.of("type", "title", "status", "code", "requestId"))
				.description("RFC 9457 Problem Details (api-conventions.md §5)")
				.addProperty("type", new StringSchema().format("uri"))
				.addProperty("title", new StringSchema())
				.addProperty("status", new IntegerSchema())
				.addProperty("instance", new StringSchema().format("uri"))
				.addProperty("code", new Schema<>().$ref("#/components/schemas/ProblemCode"))
				.addProperty("requestId", new StringSchema());
			openApi.getComponents().addSchemas("ProblemCode", code).addSchemas("Problem", problem);
		};
	}

}
