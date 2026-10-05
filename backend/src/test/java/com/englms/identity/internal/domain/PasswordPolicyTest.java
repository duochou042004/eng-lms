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

	/** SEC review S4-4: decomposed and precomposed Vietnamese passwords are the same after NFC. */
	@Test
	void normalisesToNfc() {
		String decomposed = "Tie\u0302\u0301ng-Vie\u0323\u0302t-2026";
		String precomposed = "Tiếng-Việt-2026";

		assertThat(decomposed).isNotEqualTo(precomposed);
		assertThat(PasswordPolicy.normalize(decomposed)).isEqualTo(precomposed);
		assertThat(PasswordPolicy.normalize(precomposed)).isEqualTo(precomposed);
		assertThat(policy.violations("a\u0301".repeat(10), "user")).as("10 characters after NFC").isEmpty();
		assertThat(policy.violations("a\u0301".repeat(5), "user")).containsExactly(ProblemCodes.PASSWORD_TOO_SHORT);
	}

	@Test
	void rejectsThePasswordThatEqualsTheUsername() {
		assertThat(policy.violations("Teacher.Lan", "teacher.lan")).containsExactly(ProblemCodes.PASSWORD_EQUALS_USERNAME);
		assertThat(policy.violations(" teacher.lan ", "Teacher.Lan")).containsExactly(ProblemCodes.PASSWORD_EQUALS_USERNAME);
		assertThat(policy.violations("teacher.lan2", "teacher.lan")).isEmpty();
	}

}
