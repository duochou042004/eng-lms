package com.englms.students.internal.app;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.BiFunction;
import java.util.function.Function;
import java.util.regex.Pattern;

import com.englms.shared.ProblemCodes;
import com.englms.shared.ProblemException.FieldProblem;
import com.englms.students.internal.domain.ContactHandle;
import com.englms.students.internal.domain.CustomField;
import com.englms.students.internal.domain.GuardianDetails;

/**
 * Field rules of validation-rules.md ("Common", "identity / students"): strings are trimmed, empty after trim is
 * absent, lengths count code points. Each method returns the normalised value and adds its problems to the list.
 */
final class StudentFields {

	static final int FULL_NAME_MAX = 120;

	static final int EMAIL_MAX = 254;

	static final int NOTE_MAX = 2_000;

	static final int HANDLES_MAX = 30;

	static final int HANDLE_LABEL_MAX = 60;

	static final int HANDLE_VALUE_MAX = 500;

	/** DEC-103. */
	static final int GUARDIANS_MAX = 10;

	static final int GUARDIAN_NAME_MAX = 120;

	static final int RELATIONSHIP_MAX = 40;

	static final int CURRENT_LEVEL_MAX = 40;

	static final int TAG_MAX = 40;

	/** Strengths and weaknesses each (validation-rules "identity / students"). */
	static final int TAGS_MAX = 30;

	/** RFC 5322, pragmatic: one {@code @}, no spaces, a dot in the domain. */
	private static final Pattern EMAIL = Pattern.compile("[^@\\s]+@[^@\\s]+\\.[^@\\s]+");

	private static final Pattern PHONE = Pattern.compile("[0-9 +().-]{6,20}");

	private StudentFields() {
	}

	/** C0 control characters other than tab, line feed and carriage return (a NUL breaks PostgreSQL text and jsonb). */
	private static final Pattern CONTROL = Pattern.compile("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]");

	static boolean hasControlCharacters(String raw) {
		return raw != null && CONTROL.matcher(raw).find();
	}

	/** Trimmed, empty → null. */
	static String text(String raw) {
		if (raw == null) {
			return null;
		}
		String stripped = raw.strip();
		return stripped.isEmpty() ? null : stripped;
	}

	/** {@link #text(String)}, refusing control characters ({@code INVALID_FORMAT} on {@code field}; T-M2.3 G3 QA-S3-1). */
	static String text(String raw, String field, List<FieldProblem> problems) {
		if (hasControlCharacters(raw)) {
			problems.add(problem(field, ProblemCodes.INVALID_FORMAT, "Control characters are not allowed"));
		}
		return text(raw);
	}

	static String fullName(String raw, List<FieldProblem> problems) {
		return requiredText(raw, "fullName", FULL_NAME_MAX, problems);
	}

	static String email(String raw, List<FieldProblem> problems) {
		return email(raw, "email", problems);
	}

	static String email(String raw, String field, List<FieldProblem> problems) {
		if (hasControlCharacters(raw)) {
			problems.add(problem(field, ProblemCodes.INVALID_FORMAT, "Control characters are not allowed"));
			return null;
		}
		String value = text(raw);
		if (value != null && tooLong(value, EMAIL_MAX)) {
			problems.add(problem(field, ProblemCodes.TOO_LONG, "At most " + EMAIL_MAX + " characters"));
		}
		else if (value != null && !EMAIL.matcher(value).matches()) {
			problems.add(problem(field, ProblemCodes.INVALID_FORMAT, "Not an email address"));
		}
		return value;
	}

	static String phone(String raw, List<FieldProblem> problems) {
		return phone(raw, "phone", problems);
	}

	static String phone(String raw, String field, List<FieldProblem> problems) {
		String value = text(raw);
		// The phone pattern already refuses control characters (INVALID_FORMAT).
		if (value != null && !PHONE.matcher(value).matches()) {
			problems.add(problem(field, ProblemCodes.INVALID_FORMAT, "6-20 characters of 0-9, space, + ( ) . -"));
		}
		return value;
	}

	static String note(String raw, List<FieldProblem> problems) {
		return optionalText(raw, "note", NOTE_MAX, problems);
	}

	/** Free text 0–{@code max}: trimmed, empty → null, no control characters. */
	static String optionalText(String raw, String field, int max, List<FieldProblem> problems) {
		String value = text(raw, field, problems);
		if (value != null && tooLong(value, max)) {
			problems.add(problem(field, ProblemCodes.TOO_LONG, "At most " + max + " characters"));
		}
		return value;
	}

	/** Free text 1–{@code max}. */
	static String requiredText(String raw, String field, int max, List<FieldProblem> problems) {
		int before = problems.size();
		String value = text(raw, field, problems);
		if (problems.size() > before) {
			return value;
		}
		if (value == null) {
			problems.add(problem(field, ProblemCodes.REQUIRED, "Required"));
		}
		else if (tooLong(value, max)) {
			problems.add(problem(field, ProblemCodes.TOO_LONG, "At most " + max + " characters"));
		}
		return value;
	}

	static List<ContactHandle> contactHandles(List<ContactHandle> raw, List<FieldProblem> problems) {
		return labelValues(raw, "contactHandles", ContactHandle::label, ContactHandle::value, ContactHandle::new,
				problems);
	}

	static List<CustomField> customFields(List<CustomField> raw, List<FieldProblem> problems) {
		return labelValues(raw, "customFields", CustomField::label, CustomField::value, CustomField::new, problems);
	}

	/** The common label/value list rule: label 1–60, value 0–500 (absent → ""), at most 30 entries. */
	private static <T> List<T> labelValues(List<T> raw, String name, Function<T, String> labelOf,
			Function<T, String> valueOf, BiFunction<String, String, T> entry, List<FieldProblem> problems) {
		if (raw == null) {
			return List.of();
		}
		if (raw.size() > HANDLES_MAX) {
			problems.add(problem(name, ProblemCodes.TOO_MANY, "At most " + HANDLES_MAX + " entries"));
			return List.of();
		}
		List<T> entries = new ArrayList<>();
		for (int i = 0; i < raw.size(); i++) {
			String field = name + "[" + i + "]";
			T item = raw.get(i);
			int before = problems.size();
			String label = (item != null) ? text(labelOf.apply(item), field + ".label", problems) : null;
			String checkedValue = (item != null) ? text(valueOf.apply(item), field + ".value", problems) : null;
			String value = (checkedValue != null) ? checkedValue : "";
			if (problems.size() > before) {
				entries.add(entry.apply(label, value));
				continue;
			}
			if (label == null) {
				problems.add(problem(field + ".label", ProblemCodes.REQUIRED, "Required"));
			}
			else if (tooLong(label, HANDLE_LABEL_MAX)) {
				problems.add(problem(field + ".label", ProblemCodes.TOO_LONG, "At most " + HANDLE_LABEL_MAX + " characters"));
			}
			if (tooLong(value, HANDLE_VALUE_MAX)) {
				problems.add(problem(field + ".value", ProblemCodes.TOO_LONG, "At most " + HANDLE_VALUE_MAX + " characters"));
			}
			entries.add(entry.apply(label, value));
		}
		return entries;
	}

	/**
	 * The common Tag rule (1–40, no commas or control characters of any kind), deduplicated case-insensitively keeping the first
	 * spelling, then at most {@value #TAGS_MAX}.
	 */
	static List<String> tags(List<String> raw, String name, List<FieldProblem> problems) {
		if (raw == null) {
			return List.of();
		}
		// A list far beyond the limit is one problem, not one per entry (T-M2.9 SEC S4-2); duplicates still fit below it.
		if (raw.size() > 4 * TAGS_MAX) {
			problems.add(problem(name, ProblemCodes.TOO_MANY, "At most " + TAGS_MAX + " tags"));
			return List.of();
		}
		Map<String, String> unique = new LinkedHashMap<>();
		for (int i = 0; i < raw.size(); i++) {
			String field = name + "[" + i + "]";
			String value = raw.get(i);
			// Any control character (C0 incl. tab/LF/CR, DEL, C1), checked before trimming (T-M2.9 QA F1).
			if (value != null && value.codePoints().anyMatch(Character::isISOControl)) {
				problems.add(problem(field, ProblemCodes.INVALID_FORMAT, "Control characters are not allowed"));
				continue;
			}
			String tag = text(value);
			if (tag == null) {
				problems.add(problem(field, ProblemCodes.REQUIRED, "Required"));
			}
			else if (tag.indexOf(',') >= 0) {
				problems.add(problem(field, ProblemCodes.INVALID_FORMAT, "No commas"));
			}
			else if (tooLong(tag, TAG_MAX)) {
				problems.add(problem(field, ProblemCodes.TOO_LONG, "At most " + TAG_MAX + " characters"));
			}
			else {
				unique.putIfAbsent(tag.toLowerCase(Locale.ROOT), tag);
			}
		}
		if (unique.size() > TAGS_MAX) {
			problems.add(problem(name, ProblemCodes.TOO_MANY, "At most " + TAGS_MAX + " tags"));
		}
		return List.copyOf(unique.values());
	}

	/** A guardian (FR-STU-03; DEC-103); {@code prefix} is {@code ""} or {@code "guardians[i]."}. */
	static GuardianDetails guardian(GuardianInput raw, String prefix, List<FieldProblem> problems) {
		return new GuardianDetails(requiredText(raw.name(), prefix + "name", GUARDIAN_NAME_MAX, problems),
				optionalText(raw.relationship(), prefix + "relationship", RELATIONSHIP_MAX, problems),
				phone(raw.phone(), prefix + "phone", problems), email(raw.email(), prefix + "email", problems),
				optionalText(raw.notes(), prefix + "notes", NOTE_MAX, problems));
	}

	/** Write timestamps at the database's precision (microseconds), so a write response equals the next read (T-M2.9 QA F2). */
	static Instant now(Clock clock) {
		return clock.instant().truncatedTo(ChronoUnit.MICROS);
	}

	/** The guardians of a new student (FR-STU-01): at most {@value #GUARDIANS_MAX}, field paths {@code guardians[i].name}. */
	static List<GuardianDetails> guardians(List<GuardianInput> raw, List<FieldProblem> problems) {
		if (raw == null) {
			return List.of();
		}
		if (raw.size() > GUARDIANS_MAX) {
			problems.add(problem("guardians", ProblemCodes.TOO_MANY, "At most " + GUARDIANS_MAX + " guardians"));
			return List.of();
		}
		List<GuardianDetails> guardians = new ArrayList<>();
		for (int i = 0; i < raw.size(); i++) {
			GuardianInput guardian = (raw.get(i) != null) ? raw.get(i) : new GuardianInput(null, null, null, null, null);
			guardians.add(guardian(guardian, "guardians[" + i + "].", problems));
		}
		return guardians;
	}

	static FieldProblem problem(String field, ProblemCodes code, String message) {
		return new FieldProblem(field, code, message);
	}

	private static boolean tooLong(String value, int max) {
		return value.codePointCount(0, value.length()) > max;
	}

}
