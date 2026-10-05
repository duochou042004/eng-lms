package com.englms.shared.web;

import org.springframework.boot.jackson.autoconfigure.JsonFactoryBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.core.StreamReadConstraints;

/**
 * security.md §6: JSON request bodies are limited to 1 MB (uploads are multipart, not JSON). Enforced by the parser
 * while it streams, so it also covers chunked bodies without a {@code Content-Length}: a longer document stops being
 * read at 1 MB and answers 400 {@code MALFORMED_REQUEST} (SEC review S2-2).
 */
@Configuration(proxyBeanMethods = false)
class JsonLimitsConfiguration {

	static final long MAX_JSON_DOCUMENT_BYTES = 1_000_000;

	@Bean
	JsonFactoryBuilderCustomizer jsonDocumentLimit() {
		return factory -> factory.streamReadConstraints(
				StreamReadConstraints.builder().maxDocumentLength(MAX_JSON_DOCUMENT_BYTES).build());
	}

}
