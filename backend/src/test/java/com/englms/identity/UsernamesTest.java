package com.englms.identity;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class UsernamesTest {

	@ParameterizedTest
	@CsvSource({ "Tutor.One,tutor.one", "'  co.lan  ',co.lan", "Nguyễn,nguyen", "ĐặngThị,dangthi", "TRẦN-đức,tran-duc" })
	void normalisesCaseTrimAndAccentsLikeLowerUnaccentTrim(String input, String expected) {
		assertThat(Usernames.normalize(input)).isEqualTo(expected);
	}

	@ParameterizedTest
	@ValueSource(strings = { "abc", "Co.Lan", "a_b-c.9", "x123456789012345678901234567890123456789" })
	void acceptsValidUsernames(String username) {
		assertThat(Usernames.isValid(username)).isTrue();
	}

	@ParameterizedTest
	@ValueSource(strings = { "ab", "has space", "nguyễn", "x1234567890123456789012345678901234567890", "a@b" })
	void rejectsInvalidUsernames(String username) {
		assertThat(Usernames.isValid(username)).isFalse();
	}

	@Test
	void rejectsNull() {
		assertThat(Usernames.isValid(null)).isFalse();
	}

}
