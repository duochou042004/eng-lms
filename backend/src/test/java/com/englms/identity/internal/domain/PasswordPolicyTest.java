package com.englms.identity.internal.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.englms.shared.ProblemCodes;

class PasswordPolicyTest {

	final PasswordPolicy policy = new PasswordPolicy();

	@Test
	void lengthBoundariesAre10And128Characters() {
		assertThat(policy.violations("x".repeat(9), "user")).containsExactly(ProblemCodes.PASSWORD_TOO_SHORT);
		assertThat(policy.violations("x".repeat(10), "user")).isEmpty();
		assertThat(policy.violations("x".repeat(128), "user")).isEmpty();
		assertThat(policy.violations("x".repeat(129), "user")).containsExactly(ProblemCodes.PASSWORD_TOO_LONG);
	}

	@Test
	void countsCharactersNotBytesOrUtf16Units() {
		assertThat(policy.violations("ă".repeat(10), "user")).isEmpty();
		assertThat(policy.violations("😀".repeat(128), "user")).isEmpty();
		assertThat(policy.violations("😀".repeat(9), "user")).containsExactly(ProblemCodes.PASSWORD_TOO_SHORT);
	}

	@Test
	void rejectsPasswordsFromTheBundledCommonListCaseInsensitively() {
		assertThat(policy.violations("qwertyuiop", "user")).containsExactly(ProblemCodes.PASSWORD_TOO_COMMON);
		assertThat(policy.violations("1234567890", "user")).containsExactly(ProblemCodes.PASSWORD_TOO_COMMON);
		assertThat(policy.violations("QwertyUiop", "user")).containsExactly(ProblemCodes.PASSWORD_TOO_COMMON);
		assertThat(policy.violations("password", "user")).containsExactly(ProblemCodes.PASSWORD_TOO_SHORT,
				ProblemCodes.PASSWORD_TOO_COMMON);
	}

	@Test
	void rejectsThePasswordThatEqualsTheUsername() {
		assertThat(policy.violations("Teacher.Lan", "teacher.lan")).containsExactly(ProblemCodes.PASSWORD_EQUALS_USERNAME);
		assertThat(policy.violations(" teacher.lan ", "Teacher.Lan")).containsExactly(ProblemCodes.PASSWORD_EQUALS_USERNAME);
		assertThat(policy.violations("teacher.lan2", "teacher.lan")).isEmpty();
	}

}
