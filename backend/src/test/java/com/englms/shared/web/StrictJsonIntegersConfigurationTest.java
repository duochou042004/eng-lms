package com.englms.shared.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.exc.MismatchedInputException;
import tools.jackson.databind.json.JsonMapper;

/**
 * T-M2.10 AC5: the Spring-managed {@link JsonMapper} (Boot's auto-configuration plus the real
 * {@link StrictJsonIntegersConfiguration}) binds an integer field from a JSON integer token only. A fraction or a string
 * is a {@link MismatchedInputException}, which Spring MVC answers 400 {@code MALFORMED_REQUEST}.
 */
@JsonTest
@Import(StrictJsonIntegersConfiguration.class)
class StrictJsonIntegersConfigurationTest {

	record Numbers(int primitiveInt, long primitiveLong, Long boxedLong) {
	}

	@Autowired
	JsonMapper json;

	static String body(String component, String value) {
		String primitiveInt = component.equals("primitiveInt") ? value : "1";
		String primitiveLong = component.equals("primitiveLong") ? value : "1";
		String boxedLong = component.equals("boxedLong") ? value : "1";
		return "{\"primitiveInt\":" + primitiveInt + ",\"primitiveLong\":" + primitiveLong + ",\"boxedLong\":" + boxedLong
				+ "}";
	}

	@ParameterizedTest
	@ValueSource(strings = { "primitiveInt", "primitiveLong", "boxedLong" })
	void aFractionIsRefused(String component) {
		assertThatThrownBy(() -> json.readValue(body(component, "0.7"), Numbers.class)).as(component)
			.isInstanceOf(MismatchedInputException.class);
	}

	@ParameterizedTest
	@ValueSource(strings = { "primitiveInt", "primitiveLong", "boxedLong" })
	void aNumericStringIsRefused(String component) {
		assertThatThrownBy(() -> json.readValue(body(component, "\"1\""), Numbers.class)).as(component)
			.isInstanceOf(MismatchedInputException.class);
	}

	@ParameterizedTest
	@ValueSource(strings = { "primitiveInt", "primitiveLong", "boxedLong" })
	void anIntegerIsAccepted(String component) {
		assertThat(json.readValue(body(component, "1"), Numbers.class)).as(component).isEqualTo(new Numbers(1, 1L, 1L));
	}

	@Test
	void nullIsAcceptedForTheBoxedLong() {
		assertThat(json.readValue(body("boxedLong", "null"), Numbers.class)).isEqualTo(new Numbers(1, 1L, null));
	}

}
