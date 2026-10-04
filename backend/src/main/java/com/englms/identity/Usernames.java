package com.englms.identity;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Username normalisation: {@code lower(unaccent(trim(username)))} computed by the application and checked by the
 * unique index {@code ux_user_account__username_normalized} (data-model.md §2). The students module reuses it.
 */
public final class Usernames {

	private static final Pattern COMBINING_MARKS = Pattern.compile("\\p{M}+");

	/** validation-rules.md: 3–40 characters of {@code [a-z0-9._-]} after lowercasing. */
	private static final Pattern VALID = Pattern.compile("[a-z0-9._-]{3,40}");

	private Usernames() {
	}

	public static String normalize(String username) {
		String stripped = COMBINING_MARKS.matcher(Normalizer.normalize(username.strip(), Normalizer.Form.NFD))
			.replaceAll("");
		// "đ" has no decomposition; unaccent maps it to "d".
		return stripped.replace('đ', 'd').replace('Đ', 'D').toLowerCase(Locale.ROOT);
	}

	public static boolean isValid(String username) {
		return username != null && VALID.matcher(username.strip().toLowerCase(Locale.ROOT)).matches();
	}

}
