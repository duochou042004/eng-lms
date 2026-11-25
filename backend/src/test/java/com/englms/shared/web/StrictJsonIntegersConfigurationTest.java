package com.englms.shared.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Optional;

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

	// ---- T-M2.33 AC1–AC2: textual and boolean -----------------------------------------------------------------

	record Scalars(String text, Optional<String> optionalText, Boolean boxedFlag, boolean primitiveFlag) {
	}

	static String scalars(String component, String value) {
		return "{\"text\":" + (component.equals("text") ? value : "\"a\"") + ",\"optionalText\":"
				+ (component.equals("optionalText") ? value : "\"b\"") + ",\"boxedFlag\":"
				+ (component.equals("boxedFlag") ? value : "true") + ",\"primitiveFlag\":"
				+ (component.equals("primitiveFlag") ? value : "true") + "}";
	}

	@ParameterizedTest
	@ValueSource(strings = { "text:1", "text:1.5", "text:true", "optionalText:123", "optionalText:0.5",
			"optionalText:false", "boxedFlag:1", "boxedFlag:0", "boxedFlag:1.0", "boxedFlag:\"true\"", "boxedFlag:\"\"",
			"boxedFlag:\" \"", "primitiveFlag:1", "primitiveFlag:\"false\"", "primitiveFlag:\"\"" })
	void aWrongScalarTypeIsRefused(String row) {
		String[] parts = row.split(":", 2);
		assertThatThrownBy(() -> json.readValue(scalars(parts[0], parts[1]), Scalars.class)).as(row)
			.isInstanceOf(MismatchedInputException.class);
	}

	@Test
	void stringsBooleansAndNullsAreAccepted() {
		assertThat(json.readValue(scalars("text", "\"a\""), Scalars.class))
			.isEqualTo(new Scalars("a", Optional.of("b"), true, true));
		assertThat(json.readValue("{\"text\":null,\"optionalText\":null,\"boxedFlag\":null,\"primitiveFlag\":false}",
				Scalars.class))
			.isEqualTo(new Scalars(null, Optional.empty(), null, false));
	}

}
