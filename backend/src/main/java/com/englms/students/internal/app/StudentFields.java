package com.englms.students.internal.app;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

import com.englms.shared.ProblemCodes;
import com.englms.shared.ProblemException.FieldProblem;
import com.englms.students.internal.domain.ContactHandle;

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

	/** RFC 5322, pragmatic: one {@code @}, no spaces, a dot in the domain. */
	private static final Pattern EMAIL = Pattern.compile("[^@\\s]+@[^@\\s]+\\.[^@\\s]+");

	private static final Pattern PHONE = Pattern.compile("[0-9 +().-]{6,20}");

	private StudentFields() {
	}

	static String text(String raw) {
		if (raw == null) {
			return null;
		}
		String stripped = raw.strip();
		return stripped.isEmpty() ? null : stripped;
	}

	static String fullName(String raw, List<FieldProblem> problems) {
		String value = text(raw);
		if (value == null) {
			problems.add(problem("fullName", ProblemCodes.REQUIRED, "Required"));
		}
		else if (tooLong(value, FULL_NAME_MAX)) {
			problems.add(problem("fullName", ProblemCodes.TOO_LONG, "At most " + FULL_NAME_MAX + " characters"));
		}
		return value;
	}

	static String email(String raw, List<FieldProblem> problems) {
		String value = text(raw);
		if (value != null && tooLong(value, EMAIL_MAX)) {
			problems.add(problem("email", ProblemCodes.TOO_LONG, "At most " + EMAIL_MAX + " characters"));
		}
		else if (value != null && !EMAIL.matcher(value).matches()) {
			problems.add(problem("email", ProblemCodes.INVALID_FORMAT, "Not an email address"));
		}
		return value;
	}

	static String phone(String raw, List<FieldProblem> problems) {
		String value = text(raw);
		if (value != null && !PHONE.matcher(value).matches()) {
			problems.add(problem("phone", ProblemCodes.INVALID_FORMAT, "6-20 characters of 0-9, space, + ( ) . -"));
		}
		return value;
	}

	static String note(String raw, List<FieldProblem> problems) {
		String value = text(raw);
		if (value != null && tooLong(value, NOTE_MAX)) {
			problems.add(problem("note", ProblemCodes.TOO_LONG, "At most " + NOTE_MAX + " characters"));
		}
		return value;
	}

	static List<ContactHandle> contactHandles(List<ContactHandle> raw, List<FieldProblem> problems) {
		if (raw == null) {
			return List.of();
		}
		if (raw.size() > HANDLES_MAX) {
			problems.add(problem("contactHandles", ProblemCodes.TOO_MANY, "At most " + HANDLES_MAX + " entries"));
			return List.of();
		}
		List<ContactHandle> handles = new ArrayList<>();
		for (int i = 0; i < raw.size(); i++) {
			String field = "contactHandles[" + i + "]";
			ContactHandle handle = raw.get(i);
			String label = (handle != null) ? text(handle.label()) : null;
			String value = (handle != null && text(handle.value()) != null) ? text(handle.value()) : "";
			if (label == null) {
				problems.add(problem(field + ".label", ProblemCodes.REQUIRED, "Required"));
			}
			else if (tooLong(label, HANDLE_LABEL_MAX)) {
				problems.add(problem(field + ".label", ProblemCodes.TOO_LONG, "At most " + HANDLE_LABEL_MAX + " characters"));
			}
			if (tooLong(value, HANDLE_VALUE_MAX)) {
				problems.add(problem(field + ".value", ProblemCodes.TOO_LONG, "At most " + HANDLE_VALUE_MAX + " characters"));
			}
			handles.add(new ContactHandle(label, value));
		}
		return handles;
	}

	static FieldProblem problem(String field, ProblemCodes code, String message) {
		return new FieldProblem(field, code, message);
	}

	private static boolean tooLong(String value, int max) {
		return value.codePointCount(0, value.length()) > max;
	}

}
