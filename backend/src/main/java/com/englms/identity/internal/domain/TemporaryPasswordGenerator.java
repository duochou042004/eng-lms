package com.englms.identity.internal.domain;

import java.security.SecureRandom;
import java.util.List;

/**
 * Temporary passwords (security.md §3): three random words from the bundled list plus two digits, joined with
 * hyphens, e.g. {@code orbit-candle-mirror-47} (at least 14 characters, easy to type on a phone). The randomness
 * comes from {@link SecureRandom}. With 2046 words that is about 39.6 bits; online guessing is bounded by the
 * lockout and the throttle, and the password must be changed at first sign-in.
 */
public class TemporaryPasswordGenerator {

	static final String WORDS = "identity/temporary-password-words.txt";

	private final List<String> words;

	private final SecureRandom random;

	public TemporaryPasswordGenerator(SecureRandom random) {
		this.words = PasswordPolicy.readLines(WORDS);
		this.random = random;
	}

	public String generate() {
		StringBuilder password = new StringBuilder();
		for (int i = 0; i < 3; i++) {
			password.append(words.get(random.nextInt(words.size()))).append('-');
		}
		return password.append(String.format("%02d", random.nextInt(100))).toString();
	}

}
