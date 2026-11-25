package com.englms.shared.web;

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.cfg.CoercionAction;
import tools.jackson.databind.cfg.CoercionInputShape;
import tools.jackson.databind.type.LogicalType;

/**
 * api-conventions.md §5 and validation-rules.md: a scalar field of a JSON request body binds from its own JSON type only
 * (or {@code null} where the field is nullable; an absent field keeps its meaning). Three rules:
 * <ol>
 * <li>an integer field ({@code int}, {@code long}, {@code short} and their wrappers) from a JSON integer token: a fraction,
 * an exponent, a string, an empty or a blank string is refused (Jackson's defaults coerce {@code 0.7} to 0, {@code "1"}
 * to 1 and {@code ""} to {@code null}; T-M2.9 QA F3, T-M2.10);</li>
 * <li>a {@code String} field from a JSON string: an integer, a fraction or a boolean is refused (the default turns
 * {@code 123} into {@code "123"}; T-M2.33);</li>
 * <li>a {@code Boolean}/{@code boolean} field from a JSON boolean: an integer, a fraction, a string, an empty or a blank
 * string is refused (the default turns {@code 1} and {@code "true"} into {@code true}; T-M2.33).</li>
 * </ol>
 * A refused value is a {@code MismatchedInputException}, which Spring MVC answers 400 {@code MALFORMED_REQUEST} before
 * the controller runs, so nothing is written and the sign-in throttle never counts it. One customizer on the
 * Spring-managed {@code JsonMapper}, so every request body gets it, the sign-in and student bodies included. Other
 * logical types (enums, UUIDs, dates, lists) keep Jackson's defaults.
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
						.setAcceptBlankAsEmpty(false))
			.withCoercionConfig(LogicalType.Textual,
					config -> config.setCoercion(CoercionInputShape.Integer, CoercionAction.Fail)
						.setCoercion(CoercionInputShape.Float, CoercionAction.Fail)
						.setCoercion(CoercionInputShape.Boolean, CoercionAction.Fail))
			.withCoercionConfig(LogicalType.Boolean,
					config -> config.setCoercion(CoercionInputShape.Integer, CoercionAction.Fail)
						.setCoercion(CoercionInputShape.Float, CoercionAction.Fail)
						.setCoercion(CoercionInputShape.String, CoercionAction.Fail)
						.setCoercion(CoercionInputShape.EmptyString, CoercionAction.Fail)
						.setAcceptBlankAsEmpty(false));
	}

}
