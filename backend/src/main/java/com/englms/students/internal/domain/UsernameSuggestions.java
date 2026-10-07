package com.englms.students.internal.domain;

import java.util.function.Predicate;

import com.englms.identity.Usernames;

/**
 * Username suggestions (ux-flows F2): {@link Usernames#normalize} of the full name without anything outside
 * {@code [a-z0-9]}, at most 36 characters, {@code student} when shorter than 3; then the first free of
 * {@code base}, {@code base2}, {@code base3}, … ({@code "Nguyễn Văn An"} → {@code nguyenvanan}).
 */
public final class UsernameSuggestions {

	static final int MAX_BASE = 36;

	static final String FALLBACK = "student";

	private UsernameSuggestions() {
	}

	public static String base(String fullName) {
		String base = Usernames.normalize((fullName != null) ? fullName : "").replaceAll("[^a-z0-9]", "");
		if (base.length() > MAX_BASE) {
			base = base.substring(0, MAX_BASE);
		}
		return (base.length() < 3) ? FALLBACK : base;
	}

	/** ponytail: one availability check per candidate; a prefix query if a tutor ever has hundreds of namesakes. */
	public static String firstFree(String fullName, Predicate<String> taken) {
		String base = base(fullName);
		String candidate = base;
		for (int suffix = 2; taken.test(candidate); suffix++) {
			candidate = base + suffix;
		}
		return candidate;
	}

}
