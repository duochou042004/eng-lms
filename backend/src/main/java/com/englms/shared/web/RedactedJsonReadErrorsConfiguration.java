package com.englms.shared.web;

import java.io.IOException;
import java.util.Map;

import org.springframework.boot.http.converter.autoconfigure.ServerHttpMessageConvertersCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.ResolvableType;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import tools.jackson.databind.json.JsonMapper;

/**
 * security.md §10 (T-M2.7 B1, DEC-202 S4-1): a JSON request body that cannot be read never puts its content into a log.
 * Jackson's messages quote the offending token ({@code Cannot coerce Integer value (987654321) to String}, also a
 * credential's), and Spring MVC logs the {@link HttpMessageNotReadableException} message at DEBUG
 * ({@code InvocableHandlerMethod}, {@code ExceptionHandlerExceptionResolver}). The server's JSON converter therefore
 * replaces it with one that names only the Jackson exception type and drops the cause. The 400
 * {@code MALFORMED_REQUEST} body is unchanged (it never carried the message). Ordered last, so it replaces the JSON
 * converter of Boot's Jackson customizer; it uses the same Spring-managed {@code JsonMapper} (the strict-scalar and
 * document-limit rules stay).
 */
@Configuration(proxyBeanMethods = false)
class RedactedJsonReadErrorsConfiguration {

	@Bean
	@Order(Ordered.LOWEST_PRECEDENCE)
	ServerHttpMessageConvertersCustomizer redactedJsonReadErrors(JsonMapper jsonMapper) {
		return builder -> builder.withJsonConverter(new RedactingJsonConverter(jsonMapper));
	}

	static final class RedactingJsonConverter extends JacksonJsonHttpMessageConverter {

		RedactingJsonConverter(JsonMapper mapper) {
			super(mapper);
		}

		@Override
		public Object read(ResolvableType type, HttpInputMessage inputMessage, Map<String, Object> hints)
				throws IOException {
			try {
				return super.read(type, inputMessage, hints);
			}
			catch (HttpMessageNotReadableException ex) {
				throw redacted(ex, inputMessage);
			}
		}

		@Override
		protected Object readInternal(Class<?> clazz, HttpInputMessage inputMessage) throws IOException {
			try {
				return super.readInternal(clazz, inputMessage);
			}
			catch (HttpMessageNotReadableException ex) {
				throw redacted(ex, inputMessage);
			}
		}

		static HttpMessageNotReadableException redacted(HttpMessageNotReadableException ex,
				HttpInputMessage inputMessage) {
			Throwable cause = (ex.getCause() != null) ? ex.getCause() : ex;
			return new HttpMessageNotReadableException(
					"JSON parse error: " + cause.getClass().getSimpleName() + " (content not logged)", inputMessage);
		}

	}

}
