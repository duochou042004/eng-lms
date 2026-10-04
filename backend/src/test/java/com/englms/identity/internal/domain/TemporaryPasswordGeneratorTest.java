package com.englms.identity.internal.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.security.SecureRandom;
import java.util.HashSet;
import java.util.Set;

import org.junit.jupiter.api.Test;

class TemporaryPasswordGeneratorTest {

	@Test
	void threeWordsAndTwoDigitsAtLeast12CharactersThatPassThePolicy() {
		TemporaryPasswordGenerator generator = new TemporaryPasswordGenerator(new SecureRandom());
		PasswordPolicy policy = new PasswordPolicy();
		Set<String> seen = new HashSet<>();
		for (int i = 0; i < 500; i++) {
			String password = generator.generate();
			assertThat(password).matches("[a-z]{3,8}-[a-z]{3,8}-[a-z]{3,8}-[0-9]{2}");
			assertThat(password.length()).isGreaterThanOrEqualTo(12);
			assertThat(policy.violations(password, "some.user")).isEmpty();
			seen.add(password);
		}
		assertThat(seen).as("no repeats in 500 draws of ~2^39").hasSize(500);
	}

	@Test
	void takesItsRandomnessFromSecureRandom() throws NoSuchMethodException {
		assertThat(TemporaryPasswordGenerator.class.getConstructor(SecureRandom.class)).isNotNull();
		assertThat(TemporaryPasswordGenerator.class.getDeclaredConstructors()).hasSize(1);
	}

	@Test
	void theBundledWordListHasNoForbiddenOrDuplicateWords() {
		var words = PasswordPolicy.readLines(TemporaryPasswordGenerator.WORDS);
		assertThat(words).hasSize(2046).doesNotHaveDuplicates().allMatch(word -> word.matches("[a-z]{3,8}"));
	}

}
