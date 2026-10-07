package com.englms.security;

import static com.englms.identity.Browser.quote;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.englms.security.IsolationWorld.Account;

/**
 * The authorization policy registry (security.md §4, ADR-0016 §5): one entry per handler mapping, keyed
 * {@code METHOD /path/pattern} as Spring reports it, with a sample request and the expected status per actor.
 * {@code AuthzMatrixTest} fails when a live mapping has no entry or an entry has no live mapping. {@code HEAD} and
 * {@code OPTIONS} are matched implicitly and never enumerated, so they have no entries.
 */
public final class PolicyRegistry {

	/** "Student B on A's resource" does not apply: the sample names no student-owned resource. */
	public static final Integer NA = null;

	/** Who calls. Student C (disabled) cannot sign in, so it never acts. */
	public enum Actor {

		ANONYMOUS, TUTOR, STUDENT_A, STUDENT_B_ON_A, MUST_CHANGE

	}

	/**
	 * One handler mapping. {@code path} is the mapping pattern, optionally with a sample query string; each
	 * {@code {key}} is replaced by student A's resource of that key ({@link IsolationWorld#resolve}). {@code body} builds the JSON body from the acting account (student
	 * A for the anonymous caller); null for none. CSRF is added by the harness for unsafe methods.
	 */
	public record Policy(String method, String path, Function<Account, String> body, Map<Actor, Integer> expected) {

		public static Policy of(String method, String path, Function<Account, String> body, int anonymous, int tutor,
				int studentA, Integer studentBOnA, int mustChange) {
			Map<Actor, Integer> expected = new EnumMap<>(Actor.class);
			expected.put(Actor.ANONYMOUS, anonymous);
			expected.put(Actor.TUTOR, tutor);
			expected.put(Actor.STUDENT_A, studentA);
			if (studentBOnA != null) {
				expected.put(Actor.STUDENT_B_ON_A, studentBOnA);
			}
			expected.put(Actor.MUST_CHANGE, mustChange);
			return new Policy(method, path, body, Map.copyOf(expected));
		}

		/** {@code METHOD /pattern}: the sample's query string (after {@code ?}) is not part of the key. */
		public String key() {
			int query = path.indexOf('?');
			return method + " " + ((query < 0) ? path : path.substring(0, query));
		}

		@Override
		public String toString() {
			return key();
		}

	}

	public static final List<Policy> ENTRIES = List.of(
			Policy.of("GET", "/api/v1/auth/session", null, 401, 200, 200, NA, 200),
			// The acting user's own credentials; rotates the session. The must-change gate blocks it once signed in.
			Policy.of("POST", "/api/v1/auth/login", PolicyRegistry::ownCredentials, 200, 200, 200, NA, 403),
			Policy.of("POST", "/api/v1/auth/logout", null, 204, 204, 204, NA, 204),
			// Correct current password, a too-short new one: 422 without any session or lockout side effect.
			Policy.of("POST", "/api/v1/auth/password", PolicyRegistry::tooShortNewPassword, 401, 422, 422, NA, 422),
			Policy.of("GET", "/api/v1/meta", null, 200, 200, 200, NA, 200),
			// T-M2.3, tutor: students. Tutor-only; B-on-A does not apply ({sid} = student A's student ID).
			Policy.of("POST", "/api/v1/tutor/students", PolicyRegistry::newStudent, 401, 201, 403, NA, 403),
			Policy.of("GET", "/api/v1/tutor/students", null, 401, 200, 403, NA, 403),
			Policy.of("GET", "/api/v1/tutor/students/{sid}", null, 401, 200, 403, NA, 403),
			Policy.of("PATCH", "/api/v1/tutor/students/{sid}", account -> "{\"version\":0,\"phone\":\"0901 234 567\"}",
					401, 200, 403, NA, 403),
			// Session-ending: archives student A (a fresh world per call).
			Policy.of("POST", "/api/v1/tutor/students/{sid}/status", account -> "{\"status\":\"ARCHIVED\",\"version\":0}",
					401, 200, 403, NA, 403),
			// Session-ending: resets student A's password.
			Policy.of("POST", "/api/v1/tutor/students/{sid}/password-reset", null, 401, 200, 403, NA, 403),
			Policy.of("GET", "/api/v1/tutor/usernames/suggestion?fullName=Nguy%E1%BB%85n%20V%C4%83n%20An", null, 401, 200,
					403, NA, 403),
			Policy.of("GET", "/api/v1/tutor/usernames/availability?username=free-name", null, 401, 200, 403, NA, 403));

	private PolicyRegistry() {
	}

	public static Set<String> keys(List<Policy> policies) {
		return policies.stream().map(Policy::key).collect(Collectors.toSet());
	}

	static String ownCredentials(Account account) {
		return "{\"username\":" + quote(account.username()) + ",\"password\":" + quote(account.password())
				+ ",\"rememberMe\":false}";
	}

	static String newStudent(Account account) {
		return "{\"fullName\":\"Matrix Student\",\"username\":\"matrix-student\"}";
	}

	static String tooShortNewPassword(Account account) {
		return "{\"currentPassword\":" + quote(account.password()) + ",\"newPassword\":\"short\"}";
	}

}
