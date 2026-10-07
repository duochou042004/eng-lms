package com.englms.shared;

/** SQL {@code LIKE} patterns with {@code \} as the escape character, so {@code %}, {@code _} and {@code \} match literally. */
public final class Like {

	public static final char ESCAPE = '\\';

	private Like() {
	}

	/** {@code %<escaped>%}: a substring match of {@code fragment}. */
	public static String contains(String fragment) {
		return "%" + fragment.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
	}

}
