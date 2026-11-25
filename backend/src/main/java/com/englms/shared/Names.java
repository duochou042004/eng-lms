package com.englms.shared;

import java.util.OptionalInt;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The one character rule for the workspace name and the tutor's display name (validation-rules, DEC-200 (2)); the web
 * client's {@code lib/names} mirrors it. {@link Pattern} matches by code point, so a tag character is one match and a
 * lone surrogate is {@code \p{Cs}}.
 */
public final class Names {

	/** Controls (C0, DEL, C1), format characters (bidi, zero-width, joiners, tags, U+00AD …), surrogates, U+2028, U+2029. */
	private static final Pattern FORBIDDEN = Pattern.compile("[\\p{Cc}\\p{Cf}\\p{Cs}\\p{Zl}\\p{Zp}]");

	/** Java whitespace plus every space separator (Java's {@code strip()} keeps U+00A0, U+2007, U+202F; JS {@code trim()} does not). */
	private static final Pattern ENDS = Pattern.compile("^[\\p{javaWhitespace}\\p{Z}]+|[\\p{javaWhitespace}\\p{Z}]+$");

	private Names() {
	}

	/** The first forbidden code point of {@code value}, or empty. */
	public static OptionalInt firstForbidden(String value) {
		Matcher matcher = FORBIDDEN.matcher(value);
		return matcher.find() ? OptionalInt.of(value.codePointAt(matcher.start())) : OptionalInt.empty();
	}

	/** {@code value} without leading and trailing whitespace and space separators. */
	public static String strip(String value) {
		return ENDS.matcher(value).replaceAll("");
	}

	/** Empty, or only whitespace and space separators (U+00A0, U+3000 …). */
	public static boolean isBlank(String value) {
		return strip(value).isEmpty();
	}

	/** {@code U+XXXX} (4–6 upper-case hex digits), for a problem message that names a code point without the value. */
	public static String codePoint(int codePoint) {
		return String.format("U+%04X", codePoint);
	}

}
