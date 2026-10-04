package com.englms.identity.internal.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.security.SecureRandom;

import org.junit.jupiter.api.Test;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class TruncatingBCryptPasswordEncoderTest {

	final PasswordEncoder encoder = new SecurityConfiguration().passwordEncoder();

	@Test
	void hashesAreBcryptStrength12WithTheDelegatingPrefix() {
		String hash = encoder.encode("correct-horse-battery");

		assertThat(hash).startsWith("{bcrypt}$2a$12$");
		assertThat(encoder.matches("correct-horse-battery", hash)).isTrue();
		assertThat(encoder.matches("correct-horse-batterz", hash)).isFalse();
	}

	@Test
	void hashesPasswordsLongerThan72BytesAsStandardBcryptOfTheFirst72() {
		String longPassword = "ă".repeat(128);
		String hash = new TruncatingBCryptPasswordEncoder(new SecureRandom()).encode(longPassword);

		BCryptPasswordEncoder stock = new BCryptPasswordEncoder();
		assertThat(stock.matches(longPassword, hash)).isTrue();
		assertThat(stock.matches("ă".repeat(36), hash)).as("bcrypt reads 72 bytes = 36 × 'ă'").isTrue();
		assertThat(stock.matches("ă".repeat(35), hash)).isFalse();
	}

}
