package com.englms.identity.internal.security;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;

import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * bcrypt (version {@code $2a}, strength 12) that also hashes passwords longer than bcrypt's 72-byte input. bcrypt only
 * ever uses the first 72 bytes, and Spring Security's {@code matches} still truncates, but since 6.x its
 * {@code encode} refuses longer input. NFR-SEC-06 allows 128 characters (up to 512 UTF-8 bytes), so this encoder hashes
 * the first 72 bytes: the result is a standard bcrypt hash that the stock {@link BCryptPasswordEncoder} verifies.
 * The consequence (classic bcrypt behaviour): two passwords that share their first 72 bytes are equivalent.
 */
class TruncatingBCryptPasswordEncoder extends BCryptPasswordEncoder {

	static final int STRENGTH = 12;

	private static final int BCRYPT_MAX_BYTES = 72;

	private final SecureRandom random;

	TruncatingBCryptPasswordEncoder(SecureRandom random) {
		super(BCryptVersion.$2A, STRENGTH, random);
		this.random = random;
	}

	@Override
	protected String encodeNonNullPassword(String rawPassword) {
		byte[] bytes = rawPassword.getBytes(StandardCharsets.UTF_8);
		if (bytes.length <= BCRYPT_MAX_BYTES) {
			return super.encodeNonNullPassword(rawPassword);
		}
		return BCrypt.hashpw(Arrays.copyOf(bytes, BCRYPT_MAX_BYTES), BCrypt.gensalt("$2a", STRENGTH, random));
	}

}
