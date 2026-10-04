package com.englms.identity.internal.domain;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import com.englms.identity.Usernames;
import com.englms.shared.ProblemCodes;
import org.springframework.core.io.ClassPathResource;

/**
 * NFR-SEC-06 (security.md §3, validation-rules.md): 10–128 characters, not in the bundled common-password list, not
 * equal to the username. No composition rules (NIST 800-63B). "Not equal to the current password" needs the hash
 * and is checked by the caller ({@code PASSWORD_UNCHANGED}).
 */
public class PasswordPolicy {

	public static final int MIN_LENGTH = 10;

	public static final int MAX_LENGTH = 128;

	static final String COMMON_PASSWORDS = "identity/common-passwords.txt";

	private final Set<String> common;

	public PasswordPolicy() {
		this.common = readLines(COMMON_PASSWORDS).stream().map(PasswordPolicy::fold).collect(Collectors.toUnmodifiableSet());
	}

	/** The violated rules, in a stable order; empty when the password is acceptable. */
	public List<ProblemCodes> violations(String password, String username) {
		List<ProblemCodes> codes = new ArrayList<>();
		int length = password.codePointCount(0, password.length());
		if (length < MIN_LENGTH) {
			codes.add(ProblemCodes.PASSWORD_TOO_SHORT);
		}
		if (length > MAX_LENGTH) {
			codes.add(ProblemCodes.PASSWORD_TOO_LONG);
		}
		if (common.contains(fold(password))) {
			codes.add(ProblemCodes.PASSWORD_TOO_COMMON);
		}
		if (username != null && Usernames.normalize(password).equals(Usernames.normalize(username))) {
			codes.add(ProblemCodes.PASSWORD_EQUALS_USERNAME);
		}
		return codes;
	}

	private static String fold(String value) {
		return value.toLowerCase(Locale.ROOT);
	}

	static List<String> readLines(String resource) {
		try (BufferedReader reader = new BufferedReader(
				new InputStreamReader(new ClassPathResource(resource).getInputStream(), StandardCharsets.UTF_8))) {
			return reader.lines().filter(line -> !line.isBlank()).toList();
		}
		catch (IOException ex) {
			throw new UncheckedIOException(ex);
		}
	}

}
