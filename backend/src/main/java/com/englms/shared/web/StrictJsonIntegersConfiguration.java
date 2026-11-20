package com.englms.shared.web;

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.cfg.CoercionAction;
import tools.jackson.databind.cfg.CoercionInputShape;
import tools.jackson.databind.type.LogicalType;

/**
 * api-conventions.md §5 and validation-rules.md ({@code version}: a JSON integer): an integer field ({@code int},
 * {@code long}, {@code short} and their wrappers) of a JSON body binds from a JSON integer token only (or {@code null}
 * where the field is nullable). Jackson's defaults coerce {@code 0.7} to 0, {@code "1"} to 1 and {@code ""} to
 * {@code null}; here a fraction, an exponent, a string, an empty or a blank string is a {@code MismatchedInputException},
 * which Spring MVC answers 400 {@code MALFORMED_REQUEST} before the controller runs (T-M2.9 QA F3, T-M2.10).
 * <p>
 * One rule on the Spring-managed {@code JsonMapper}, so every request body gets it, the sign-in and student bodies
 * included. Other scalar coercions (a number for a string, {@code "true"} for a boolean) are unchanged.
 */
@Configuration(proxyBeanMethods = false)
class StrictJsonIntegersConfiguration {

	@Bean
	JsonMapperBuilderCustomizer strictJsonIntegers() {
		return builder -> builder.disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
			.withCoercionConfig(LogicalType.Integer,
					config -> config.setCoercion(CoercionInputShape.Float, CoercionAction.Fail)
						.setCoercion(CoercionInputShape.String, CoercionAction.Fail)
						.setCoercion(CoercionInputShape.EmptyString, CoercionAction.Fail)
						.setAcceptBlankAsEmpty(false));
	}

}
