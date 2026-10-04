package com.englms.identity;

import static com.englms.identity.IdentityFixtures.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import com.englms.TestcontainersConfiguration;
import com.englms.identity.Browser.Response;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * T-M2.1 AC2–AC9 over HTTP on the real Tomcat port (cookies, CSRF, the filter chain). The per-IP throttle is raised
 * here so that the many sign-ins of this class never trip it; {@link LoginThrottleApiTest} tests it.
 */
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=100000" })
@Import(TestcontainersConfiguration.class)
class AuthApiIntegrationTest {

	@LocalServerPort
	int port;

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	AccountApi accounts;

	UUID tutorId;

	@BeforeEach
	void setUp() {
		IdentityFixtures.reset(jdbc);
		tutorId = IdentityFixtures.insert(jdbc, "Tutor.One", PASSWORD, Role.TUTOR, false);
	}

	Browser browser() {
		return new Browser(port);
	}

	Browser signedIn(String username, boolean rememberMe) {
		Browser browser = browser();
		assertThat(browser.login(username, PASSWORD, rememberMe).status()).isEqualTo(200);
		return browser;
	}

	UUID student(String username, boolean mustChange) {
		return IdentityFixtures.insert(jdbc, username, PASSWORD, Role.STUDENT, mustChange);
	}

	int count(String sql, Object... args) {
		return jdbc.queryForObject(sql, Integer.class, args);
	}

	// ---- AC2 -------------------------------------------------------------------------------------------------

	@Test
	void loginIsCaseInsensitiveAndTrimmedAndReturnsTheSessionBodyWithSecureCookieFlags() {
		Browser browser = browser();
		Response response = browser.login("  tUTOR.one ", PASSWORD, false);

		assertThat(response.status()).isEqualTo(200);
		assertThat(response.json().path("userId").asString()).isEqualTo(tutorId.toString());
		assertThat(response.json().path("username").asString()).isEqualTo("Tutor.One");
		assertThat(response.json().path("role").asString()).isEqualTo("TUTOR");
		assertThat(response.json().path("locale").asString()).isEqualTo("vi");
		assertThat(response.json().path("timeZone").asString()).isEqualTo("Asia/Ho_Chi_Minh");
		assertThat(response.json().path("mustChangePassword").asBoolean()).isFalse();
		assertThat(response.json().has("displayName")).isTrue();
		assertThat(response.json().propertyNames()).containsExactlyInAnyOrder("userId", "username", "role",
				"displayName", "locale", "timeZone", "mustChangePassword");
		assertThat(response.header("Location")).isNull();

		String cookie = response.setCookie(Browser.SESSION);
		assertThat(cookie).contains("HttpOnly", "Secure", "SameSite=Lax", "Path=/");
		assertThat(response.setCookie(Browser.REMEMBER_ME)).isNull();
		// Stored in Spring Session JDBC, indexed by the user ID (not the username), with the 12 h idle timeout.
		assertThat(jdbc.queryForObject("SELECT principal_name FROM spring_session WHERE session_id = ?", String.class,
				browser.sessionId())).isEqualTo(tutorId.toString());
		assertThat(count("SELECT max_inactive_interval FROM spring_session WHERE session_id = ?", browser.sessionId()))
			.isEqualTo(12 * 3600);
		assertThat(count("SELECT count(*) FROM user_account WHERE id = ? AND last_login_at IS NOT NULL", tutorId)).isOne();
		assertThat(count("SELECT count(*) FROM audit_event WHERE action = 'LOGIN_SUCCEEDED' AND subject_id = ?",
				tutorId)).isOne();
		assertThat(browser.get("/api/v1/auth/session").status()).isEqualTo(200);
	}

	@Test
	void loginIgnoresARedirectTarget() {
		Browser browser = browser();
		Response response = browser.post("/api/v1/auth/login?next=https://evil.example/x",
				"{\"username\":\"tutor.one\",\"password\":\"" + PASSWORD + "\",\"next\":\"https://evil.example/\"}");

		assertThat(response.status()).isEqualTo(200);
		assertThat(response.header("Location")).isNull();
		assertThat(response.body()).doesNotContain("evil", "next", "redirect");
	}

	@Test
	void loginRotatesTheSessionIdAndThePreLoginIdNoLongerAuthenticates() {
		Browser browser = signedIn("tutor.one", false);
		String before = browser.cookies.get(Browser.SESSION);

		assertThat(browser.login("tutor.one", PASSWORD, false).status()).isEqualTo(200);
		String after = browser.cookies.get(Browser.SESSION);

		assertThat(after).isNotEqualTo(before);
		Browser replay = browser();
		replay.cookies.put(Browser.SESSION, before);
		Response old = replay.get("/api/v1/auth/session");
		assertThat(old.status()).isEqualTo(401);
		assertThat(old.code()).isEqualTo("SESSION_EXPIRED");
		assertThat(browser.get("/api/v1/auth/session").status()).isEqualTo(200);
	}

	@Test
	void concurrentSessionsOfOneUserAreAllowed() {
		Browser phone = signedIn("tutor.one", false);
		Browser laptop = signedIn("tutor.one", false);

		assertThat(phone.get("/api/v1/auth/session").status()).isEqualTo(200);
		assertThat(laptop.get("/api/v1/auth/session").status()).isEqualTo(200);
		assertThat(count("SELECT count(*) FROM spring_session WHERE principal_name = ?", tutorId.toString())).isEqualTo(2);
	}

	// ---- AC3 -------------------------------------------------------------------------------------------------

	@Test
	void everyFailureGetsTheSameGeneric401Body() {
		UUID disabled = student("disabled.student", false);
		jdbc.update("UPDATE user_account SET status = 'DISABLED' WHERE id = ?", disabled);
		UUID expired = student("expired.student", true);
		jdbc.update("UPDATE user_account SET temp_password_expires_at = now() - interval '1 minute' WHERE id = ?",
				expired);

		List<Response> failures = List.of(browser().login("nobody.here", PASSWORD, false),
				browser().login("tutor.one", "wrong-password-1", false),
				browser().login("disabled.student", PASSWORD, false), browser().login("expired.student", PASSWORD, false));

		assertThat(failures).allSatisfy(response -> {
			assertThat(response.status()).isEqualTo(401);
			assertThat(response.code()).isEqualTo("UNAUTHENTICATED");
			assertThat(response.bodyWithoutRequestId()).isEqualTo(failures.getFirst().bodyWithoutRequestId());
			assertThat(response.setCookie(Browser.SESSION)).isNull();
		});
		assertThat(jdbc.queryForList("SELECT details->>'reason' FROM audit_event WHERE action = 'LOGIN_FAILED'", String.class))
			.containsExactlyInAnyOrder("UNKNOWN_USERNAME", "BAD_PASSWORD", "ACCOUNT_DISABLED", "TEMPORARY_PASSWORD_EXPIRED");
		assertThat(jdbc.queryForList("SELECT details::text || coalesce(user_agent, '') FROM audit_event", String.class))
			.noneMatch(row -> row.contains(PASSWORD) || row.contains("wrong-password-1") || row.contains("nobody.here"));
	}

	/**
	 * T16: an unknown username costs one bcrypt comparison like a wrong password. Documented tolerance (evidence
	 * summary): the medians of 5 attempts each differ by less than max(100 ms, half the wrong-password median).
	 */
	@Test
	void unknownUsernameAndWrongPasswordTakeSimilarTime() {
		browser().login("nobody.here", "x", false);
		browser().login("tutor.one", "x", false);
		long unknown = medianMillis(() -> browser().login("nobody.here", "wrong-password-1", false));
		long wrong = medianMillis(() -> browser().login("tutor.one", "wrong-password-1", false));

		assertThat(Math.abs(unknown - wrong)).as("unknown %d ms vs wrong password %d ms", unknown, wrong)
			.isLessThan(Math.max(100, wrong / 2));
		assertThat(unknown).as("an unknown username runs the encoder (bcrypt-12)").isGreaterThan(20);
	}

	static long medianMillis(Runnable attempt) {
		List<Long> times = new ArrayList<>();
		for (int i = 0; i < 5; i++) {
			long start = System.nanoTime();
			attempt.run();
			times.add((System.nanoTime() - start) / 1_000_000);
		}
		times.sort(null);
		return times.get(2);
	}

	/**
	 * SEC review S2-1: bcrypt runs without the account's row lock, so parallel wrong-password attempts on an existing
	 * username take about as long as on an unknown one (no staircase, no username oracle). Loose tolerance: the
	 * existing-user burst may take at most 1.5 × the unknown-user burst + 300 ms (with the lock it was ~5×).
	 */
	@Test
	void parallelFailedLoginsTakeSimilarTimeForUnknownAndExistingUsernames() throws Exception {
		parallelLoginsMillis("nobody.here", 6);
		long unknown = parallelLoginsMillis("nobody.here", 6);
		long existing = parallelLoginsMillis("tutor.one", 6);

		assertThat(existing).as("existing %d ms vs unknown %d ms", existing, unknown).isLessThan(unknown * 3 / 2 + 300);
	}

	/**
	 * SEC review S2-1: a burst on one username holds no locks or connections that another user's sign-in needs. With the
	 * lock held across bcrypt the 30 attempts were serialised and an unrelated login waited ~20 × its own time (6.4 s);
	 * now it only shares the CPU. Bound: max(3 s, 12 × a lone login's median), loose for a loaded machine.
	 */
	@Test
	void anUnrelatedLoginStaysFastDuringABurstOnOneUsername() throws Exception {
		student("student.c", false);
		Browser unrelated = browser();
		unrelated.get("/api/v1/auth/session");
		long alone = medianMillis(() -> new Browser(port).login("student.c", "wrong-password-1", false));
		try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
			List<Browser> attackers = new ArrayList<>();
			for (int i = 0; i < 30; i++) {
				Browser attacker = browser();
				attacker.get("/api/v1/auth/session");
				attackers.add(attacker);
			}
			List<Future<Response>> burst = new ArrayList<>();
			for (Browser attacker : attackers) {
				burst.add(pool.submit(() -> attacker.login("tutor.one", "wrong-password-1", false)));
			}
			Thread.sleep(100);
			long during = timed(() -> assertThat(unrelated.login("student.c", PASSWORD, false).status()).isEqualTo(200));
			for (Future<Response> attempt : burst) {
				assertThat(attempt.get().status()).isEqualTo(401);
			}
			assertThat(during).as("unrelated login %d ms during the burst, %d ms alone", during, alone)
				.isLessThan(Math.max(3000, alone * 12));
		}
	}

	long parallelLoginsMillis(String username, int n) throws Exception {
		List<Browser> browsers = new ArrayList<>();
		for (int i = 0; i < n; i++) {
			Browser browser = browser();
			browser.get("/api/v1/auth/session");
			browsers.add(browser);
		}
		try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
			long start = System.nanoTime();
			List<Future<Response>> attempts = new ArrayList<>();
			for (Browser browser : browsers) {
				attempts.add(pool.submit(() -> browser.login(username, "wrong-password-1", false)));
			}
			for (Future<Response> attempt : attempts) {
				assertThat(attempt.get().status()).isEqualTo(401);
			}
			return (System.nanoTime() - start) / 1_000_000;
		}
	}

	static long timed(Runnable action) {
		long start = System.nanoTime();
		action.run();
		return (System.nanoTime() - start) / 1_000_000;
	}

	/** SEC review S2-2: a body over the 1 MB JSON limit is refused before the service; over-long fields get the generic 401. */
	@Test
	void anOversizedBodyIsRefusedAndOverLongFieldsGetTheGeneric401() {
		Response huge = browser().post("/api/v1/auth/login",
				"{\"username\":\"" + "u".repeat(2_000_000) + "\",\"password\":\"x\"}");
		assertThat(huge.status()).isEqualTo(400);
		assertThat(huge.code()).isEqualTo("MALFORMED_REQUEST");
		assertThat(count("SELECT count(*) FROM audit_event")).as("never reached the service").isZero();

		Response longUsername = browser().login("u".repeat(100_000), PASSWORD, false);
		Response longPassword = browser().login("tutor.one", "p".repeat(2000), false);
		Response wrong = browser().login("tutor.one", "wrong-password-1", false);

		assertThat(List.of(longUsername, longPassword)).allSatisfy(response -> {
			assertThat(response.status()).isEqualTo(401);
			assertThat(response.bodyWithoutRequestId()).isEqualTo(wrong.bodyWithoutRequestId());
		});
		assertThat(jdbc.queryForList("SELECT details->>'reason' FROM audit_event", String.class))
			.containsExactlyInAnyOrder("REJECTED_INPUT", "REJECTED_INPUT", "BAD_PASSWORD");
		assertThat(count("SELECT failed_login_count FROM user_account WHERE id = ?", tutorId)).isOne();
	}

	// ---- AC4 -------------------------------------------------------------------------------------------------

	@Test
	void tenConsecutiveFailuresLockTheAccountWhichUnlocksAfterTheLockExpires() {
		for (int i = 0; i < 10; i++) {
			assertThat(browser().login("tutor.one", "wrong-password-" + i, false).status()).isEqualTo(401);
		}
		Response locked = browser().login("tutor.one", PASSWORD, false);
		browser().login("tutor.one", "wrong-password-x", false);

		assertThat(locked.status()).isEqualTo(401);
		assertThat(locked.code()).isEqualTo("UNAUTHENTICATED");
		assertThat(count("SELECT count(*) FROM audit_event WHERE action = 'ACCOUNT_LOCKED' AND subject_id = ?", tutorId))
			.isOne();
		assertThat(count("""
				SELECT count(*) FROM user_account WHERE id = ?
				  AND locked_until BETWEEN now() + interval '14 minutes' AND now() + interval '16 minutes'""", tutorId))
			.isOne();

		jdbc.update("UPDATE user_account SET locked_until = now() - interval '1 second' WHERE id = ?", tutorId);
		assertThat(browser().login("tutor.one", PASSWORD, false).status()).isEqualTo(200);
		assertThat(count("SELECT failed_login_count FROM user_account WHERE id = ?", tutorId)).isZero();
	}

	// ---- AC5 -------------------------------------------------------------------------------------------------

	@Test
	void rememberMeReauthenticatesAfterTheSessionIsDeletedAndRotatesItsToken() {
		Browser browser = signedIn("tutor.one", true);
		String rememberMe = browser.cookies.get(Browser.REMEMBER_ME);
		assertThat(rememberMe).isNotNull();
		assertThat(count("SELECT count(*) FROM persistent_logins WHERE username = ?", tutorId.toString())).isOne();
		String tokenBefore = jdbc.queryForObject("SELECT token FROM persistent_logins", String.class);

		jdbc.update("DELETE FROM spring_session");
		Response response = browser.get("/api/v1/auth/session");

		assertThat(response.status()).isEqualTo(200);
		assertThat(response.json().path("userId").asString()).isEqualTo(tutorId.toString());
		assertThat(response.setCookie(Browser.SESSION)).isNotNull();
		assertThat(browser.cookies.get(Browser.REMEMBER_ME)).isNotEqualTo(rememberMe);
		assertThat(jdbc.queryForObject("SELECT token FROM persistent_logins", String.class)).isNotEqualTo(tokenBefore);
	}

	@Test
	void rememberMeCookieHasTheSecureFlagsAndThirtyDays() {
		Response response = browser().login("tutor.one", PASSWORD, true);

		assertThat(response.setCookie(Browser.REMEMBER_ME)).contains("HttpOnly", "Secure", "SameSite=Lax", "Path=/",
				"Max-Age=2592000");
	}

	@Test
	void rememberMeReauthenticatesAfterTheSessionIdleExpired() {
		Browser browser = signedIn("tutor.one", true);
		jdbc.update("UPDATE spring_session SET last_access_time = 0, expiry_time = 1");

		assertThat(browser.get("/api/v1/auth/session").status()).isEqualTo(200);
	}

	@Test
	void anExpiredRememberMeTokenDoesNotAuthenticate() {
		Browser browser = signedIn("tutor.one", true);
		jdbc.update("DELETE FROM spring_session");
		jdbc.update("UPDATE persistent_logins SET last_used = now() - interval '31 days'");

		assertThat(browser.get("/api/v1/auth/session").status()).isEqualTo(401);
	}

	@Test
	void withoutRememberMeNoCookieAndNoToken() {
		Browser browser = signedIn("tutor.one", false);
		jdbc.update("DELETE FROM spring_session");

		assertThat(browser.cookies).doesNotContainKey(Browser.REMEMBER_ME);
		assertThat(count("SELECT count(*) FROM persistent_logins")).isZero();
		Response response = browser.get("/api/v1/auth/session");
		assertThat(response.status()).isEqualTo(401);
		assertThat(response.code()).isEqualTo("SESSION_EXPIRED");
	}

	/** SEC review S3-1: an already-rotated token (parallel requests, or theft) is a 401 SESSION_EXPIRED, never a 500. */
	@Test
	void aReusedRememberMeTokenIs401SessionExpiredNotA500() {
		Browser browser = signedIn("tutor.one", true);
		String original = browser.cookies.get(Browser.REMEMBER_ME);
		jdbc.update("DELETE FROM spring_session");
		assertThat(browser.get("/api/v1/auth/session").status()).isEqualTo(200);

		Browser replay = browser();
		replay.cookies.put(Browser.REMEMBER_ME, original);
		Response response = replay.get("/api/v1/auth/session");

		assertThat(response.status()).isEqualTo(401);
		assertThat(response.code()).isEqualTo("SESSION_EXPIRED");
		assertThat(response.setCookie(Browser.REMEMBER_ME)).contains("Expires=Thu, 01 Jan 1970");
	}

	@Test
	void parallelRequestsWithOneRememberMeCookieNeverAnswer500() throws Exception {
		for (int round = 0; round < 5; round++) {
			Browser browser = signedIn("tutor.one", true);
			String cookie = browser.cookies.get(Browser.REMEMBER_ME);
			jdbc.update("DELETE FROM spring_session");
			try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
				List<Future<Response>> responses = new ArrayList<>();
				for (int i = 0; i < 4; i++) {
					Browser copy = browser();
					copy.cookies.put(Browser.REMEMBER_ME, cookie);
					responses.add(pool.submit(() -> copy.get("/api/v1/auth/session")));
				}
				for (Future<Response> response : responses) {
					Response r = response.get();
					assertThat(r.status()).isIn(200, 401);
					if (r.status() == 401) {
						assertThat(r.code()).isEqualTo("SESSION_EXPIRED");
					}
				}
			}
		}
	}

	/** SEC review S4-2: a login on a device that still carries another user's remember-me cookie deletes that token. */
	@Test
	void aLoginDeletesTheRememberMeTokenItWasSentWith() {
		student("student.d", false);
		Browser shared = signedIn("tutor.one", true);
		assertThat(count("SELECT count(*) FROM persistent_logins")).isOne();

		Response response = shared.login("student.d", PASSWORD, false);

		assertThat(response.status()).isEqualTo(200);
		assertThat(response.setCookie(Browser.REMEMBER_ME)).contains("Expires=Thu, 01 Jan 1970");
		assertThat(shared.cookies).doesNotContainKey(Browser.REMEMBER_ME);
		assertThat(count("SELECT count(*) FROM persistent_logins")).isZero();
	}

	/** SEC review S4-3: no remember-me while the password must change. */
	@Test
	void aMustChangeUserGetsNoRememberMe() {
		student("new.student", true);
		Response response = browser().login("new.student", PASSWORD, true);

		assertThat(response.status()).isEqualTo(200);
		assertThat(response.setCookie(Browser.REMEMBER_ME)).isNull();
		assertThat(count("SELECT count(*) FROM persistent_logins")).isZero();
	}

	// ---- AC6 -------------------------------------------------------------------------------------------------

	@Test
	void logoutEndsTheSessionAndThisDevicesTokenAndExpiresBothCookies() {
		Browser browser = signedIn("tutor.one", true);
		Browser otherDevice = signedIn("tutor.one", true);
		String oldSession = browser.cookies.get(Browser.SESSION);

		Response response = browser.post("/api/v1/auth/logout", null);

		assertThat(response.status()).isEqualTo(204);
		assertThat(response.setCookie(Browser.SESSION)).contains("Max-Age=0");
		assertThat(response.setCookie(Browser.REMEMBER_ME)).startsWith(Browser.REMEMBER_ME + "=;")
			.contains("Expires=Thu, 01 Jan 1970");
		assertThat(count("SELECT count(*) FROM persistent_logins")).as("the other device keeps its token").isOne();
		Browser replay = browser();
		replay.cookies.put(Browser.SESSION, oldSession);
		Response old = replay.get("/api/v1/auth/session");
		assertThat(old.status()).isEqualTo(401);
		assertThat(old.code()).isEqualTo("SESSION_EXPIRED");
		Response none = browser().get("/api/v1/auth/session");
		assertThat(none.status()).isEqualTo(401);
		assertThat(none.code()).isEqualTo("UNAUTHENTICATED");
		assertThat(otherDevice.get("/api/v1/auth/session").status()).isEqualTo(200);
	}

	@Test
	void anonymousLogoutWithCsrfIsIdempotent() {
		assertThat(browser().post("/api/v1/auth/logout", null).status()).isEqualTo(204);
	}

	@Test
	void everyApiResponseIsNoStore() {
		Browser tutor = signedIn("tutor.one", false);
		List<Response> responses = List.of(tutor.get("/api/v1/auth/session"), tutor.get("/api/v1/meta"),
				tutor.get("/api/v1/nothing-here"), browser().get("/api/v1/auth/session"), browser().get("/api/v1/tutor/x"),
				browser().send("POST", "/api/v1/auth/login", "{}", false), tutor.get("/api/v1/student/x"),
				tutor.post("/api/v1/auth/password", "{\"currentPassword\":\"x\",\"newPassword\":\"y\"}"),
				browser().login("tutor.one", PASSWORD, false));

		assertThat(responses).extracting(Response::status).containsExactly(200, 200, 404, 401, 401, 403, 403, 422, 200);
		assertThat(responses).allSatisfy(response -> assertThat(response.header("Cache-Control")).contains("no-store"));
	}

	// ---- AC7 -------------------------------------------------------------------------------------------------

	@Test
	void aWrongCurrentPasswordIs422AndCountsTowardTheLockout() {
		Browser browser = signedIn("tutor.one", false);

		Response response = browser.post("/api/v1/auth/password",
				"{\"currentPassword\":\"wrong-password-1\",\"newPassword\":\"a-brand-new-secret\"}");

		assertThat(response.status()).isEqualTo(422);
		assertThat(response.code()).isEqualTo("VALIDATION_FAILED");
		assertThat(response.json().path("errors").get(0).path("field").asString()).isEqualTo("currentPassword");
		assertThat(response.json().path("errors").get(0).path("code").asString()).isEqualTo("CURRENT_PASSWORD_INCORRECT");
		assertThat(count("SELECT failed_login_count FROM user_account WHERE id = ?", tutorId)).isOne();
	}

	@Test
	void reachingTheLockThroughThePasswordChangeEndsAllSessionsAndTokens() {
		Browser browser = signedIn("tutor.one", true);
		Browser otherDevice = signedIn("tutor.one", true);
		jdbc.update("UPDATE user_account SET failed_login_count = 9 WHERE id = ?", tutorId);

		Response response = browser.post("/api/v1/auth/password",
				"{\"currentPassword\":\"wrong-password-1\",\"newPassword\":\"a-brand-new-secret\"}");

		assertThat(response.status()).isEqualTo(422);
		assertThat(count("SELECT count(*) FROM spring_session")).isZero();
		assertThat(count("SELECT count(*) FROM persistent_logins")).isZero();
		assertThat(browser.get("/api/v1/auth/session").status()).isEqualTo(401);
		assertThat(otherDevice.get("/api/v1/auth/session").status()).isEqualTo(401);
		assertThat(count("SELECT count(*) FROM audit_event WHERE action = 'ACCOUNT_LOCKED'")).isOne();
	}

	@ParameterizedTest
	@ValueSource(strings = { "short-pwd|PASSWORD_TOO_SHORT", "exactly10c|-", "qwertyuiop|PASSWORD_TOO_COMMON",
			"QwertyUIOP|PASSWORD_TOO_COMMON", "correct-horse-battery|PASSWORD_UNCHANGED" })
	void theNewPasswordMustMeetThePolicy(String testCase) {
		String newPassword = testCase.substring(0, testCase.indexOf('|'));
		String code = testCase.substring(testCase.indexOf('|') + 1);
		Browser browser = signedIn("tutor.one", false);

		Response response = browser.post("/api/v1/auth/password",
				"{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":" + Browser.quote(newPassword) + "}");

		if (code.equals("-")) {
			assertThat(response.status()).isEqualTo(204);
			return;
		}
		assertThat(response.status()).isEqualTo(422);
		assertThat(response.code()).isEqualTo("VALIDATION_FAILED");
		assertThat(response.json().path("errors").get(0).path("field").asString()).isEqualTo("newPassword");
		assertThat(response.json().path("errors").get(0).path("code").asString()).isEqualTo(code);
	}

	@Test
	void theNewPasswordMustNotEqualTheUsernameNorExceed128Characters() {
		IdentityFixtures.insert(jdbc, "long.username.x", PASSWORD, Role.STUDENT, false);
		Browser browser = signedIn("long.username.x", false);

		Response sameAsUsername = browser.post("/api/v1/auth/password",
				"{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"LONG.USERNAME.X\"}");
		Response tooLong = browser.post("/api/v1/auth/password",
				"{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"" + "a".repeat(129) + "\"}");
		// 128 characters is allowed, although bcrypt itself reads only 72 bytes (TruncatingBCryptPasswordEncoder).
		Response longest = browser.post("/api/v1/auth/password",
				"{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"" + "ă".repeat(128) + "\"}");

		assertThat(sameAsUsername.json().path("errors").get(0).path("code").asString()).isEqualTo("PASSWORD_EQUALS_USERNAME");
		assertThat(tooLong.json().path("errors").get(0).path("code").asString()).isEqualTo("PASSWORD_TOO_LONG");
		assertThat(longest.status()).isEqualTo(204);
		assertThat(browser().login("long.username.x", "ă".repeat(128), false).status()).isEqualTo(200);
	}

	@Test
	void aSuccessfulChangeRotatesTheSessionAndEndsEveryOtherSessionAndToken() {
		jdbc.update("UPDATE user_account SET must_change_password = true, temp_password_expires_at = now() + interval '1 day'");
		Browser browser = signedIn("tutor.one", true);
		Browser otherDevice = signedIn("tutor.one", true);
		String before = browser.cookies.get(Browser.SESSION);

		Response response = browser.post("/api/v1/auth/password",
				"{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"a-brand-new-secret\"}");

		assertThat(response.status()).isEqualTo(204);
		assertThat(browser.cookies.get(Browser.SESSION)).isNotEqualTo(before);
		Response session = browser.get("/api/v1/auth/session");
		assertThat(session.status()).isEqualTo(200);
		assertThat(session.json().path("mustChangePassword").asBoolean()).isFalse();
		assertThat(otherDevice.get("/api/v1/auth/session").status()).isEqualTo(401);
		assertThat(count("SELECT count(*) FROM persistent_logins")).isZero();
		assertThat(count("SELECT count(*) FROM spring_session")).isOne();
		assertThat(jdbc.queryForObject("SELECT password_hash FROM user_account WHERE id = ?", String.class, tutorId))
			.startsWith("{bcrypt}$2a$12$");
		assertThat(count("""
				SELECT count(*) FROM user_account
				WHERE id = ? AND NOT must_change_password AND temp_password_expires_at IS NULL""", tutorId)).isOne();
		assertThat(count("SELECT count(*) FROM audit_event WHERE action = 'PASSWORD_CHANGED' AND actor_user_id = ?",
				tutorId)).isOne();
		assertThat(browser().login("tutor.one", "a-brand-new-secret", false).status()).isEqualTo(200);
		assertThat(browser().login("tutor.one", PASSWORD, false).status()).isEqualTo(401);
	}

	/** SEC review S4-3: an expired temporary password is not accepted as the current one. */
	@Test
	void anExpiredTemporaryPasswordIsNotAcceptedAsTheCurrentPassword() {
		UUID id = student("temp.student", true);
		jdbc.update("UPDATE user_account SET temp_password_expires_at = now() + interval '1 hour' WHERE id = ?", id);
		Browser browser = signedIn("temp.student", false);
		jdbc.update("UPDATE user_account SET temp_password_expires_at = now() - interval '1 minute' WHERE id = ?", id);

		Response response = browser.post("/api/v1/auth/password",
				"{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"a-brand-new-secret\"}");

		assertThat(response.status()).isEqualTo(422);
		assertThat(response.json().path("errors").get(0).path("code").asString()).isEqualTo("CURRENT_PASSWORD_INCORRECT");
	}

	/** SEC review S4-4: a password set with combining marks signs in when typed precomposed, and the reverse. */
	@Test
	void passwordsAreComparedInUnicodeNfc() {
		String decomposed = "Me\u0302\u0323t-qua\u0301-roi-nhe\u0301";
		String precomposed = java.text.Normalizer.normalize(decomposed, java.text.Normalizer.Form.NFC);
		assertThat(precomposed).isNotEqualTo(decomposed);
		Browser browser = signedIn("tutor.one", false);

		assertThat(browser.post("/api/v1/auth/password", "{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":"
				+ Browser.quote(decomposed) + "}").status()).isEqualTo(204);

		assertThat(browser().login("tutor.one", precomposed, false).status()).isEqualTo(200);
		assertThat(browser().login("tutor.one", decomposed, false).status()).isEqualTo(200);
	}

	@Test
	void anonymousPasswordChangeWithCsrfIs401() {
		Response response = browser().post("/api/v1/auth/password",
				"{\"currentPassword\":\"x\",\"newPassword\":\"y\"}");

		assertThat(response.status()).isEqualTo(401);
		assertThat(response.code()).isEqualTo("UNAUTHENTICATED");
	}

	// ---- AC8 -------------------------------------------------------------------------------------------------

	@Test
	void aMustChangeTutorIsGatedEverywhereExceptTheFourAllowedRequests() {
		jdbc.update("UPDATE user_account SET must_change_password = true WHERE id = ?", tutorId);
		Browser tutor = signedIn("tutor.one", false);

		Response session = tutor.get("/api/v1/auth/session");
		assertThat(session.status()).isEqualTo(200);
		assertThat(session.json().path("mustChangePassword").asBoolean()).isTrue();
		assertThat(tutor.get("/api/v1/meta").status()).isEqualTo(200);
		for (Response gated : List.of(tutor.get("/api/v1/tutor/x"), tutor.get("/api/v1/x"),
				tutor.post("/api/v1/auth/register", "{}"), tutor.login("tutor.one", PASSWORD, false))) {
			assertThat(gated.status()).isEqualTo(403);
			assertThat(gated.code()).isEqualTo("PASSWORD_CHANGE_REQUIRED");
		}
		Response studentPath = tutor.get("/api/v1/student/x");
		assertThat(studentPath.status()).isEqualTo(403);
		assertThat(studentPath.code()).isEqualTo("FORBIDDEN_ROLE");

		assertThat(tutor.post("/api/v1/auth/password",
				"{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"a-brand-new-secret\"}").status()).isEqualTo(204);
		assertThat(tutor.get("/api/v1/tutor/x").status()).isEqualTo(404);
		assertThat(tutor.post("/api/v1/auth/logout", null).status()).isEqualTo(204);
	}

	/** SEC review S4-5: HEAD /api/v1/meta is public like GET, also through the must-change gate. */
	@Test
	void headMetaIsPublicAndPassesTheGate() {
		jdbc.update("UPDATE user_account SET must_change_password = true WHERE id = ?", tutorId);
		Browser tutor = signedIn("tutor.one", false);

		assertThat(browser().send("HEAD", "/api/v1/meta", null, false).status()).isEqualTo(200);
		assertThat(tutor.send("HEAD", "/api/v1/meta", null, false).status()).isEqualTo(200);
	}

	@Test
	void aMustChangeStudentIsGatedOnTheStudentNamespaceAndLogoutPasses() {
		student("new.student", true);
		Browser student = signedIn("new.student", false);

		Response gated = student.get("/api/v1/student/home");
		assertThat(gated.status()).isEqualTo(403);
		assertThat(gated.code()).isEqualTo("PASSWORD_CHANGE_REQUIRED");
		assertThat(student.get("/api/v1/tutor/x").code()).isEqualTo("FORBIDDEN_ROLE");
		assertThat(student.post("/api/v1/auth/logout", null).status()).isEqualTo(204);
	}

	// ---- AC9 -------------------------------------------------------------------------------------------------

	@ParameterizedTest
	@ValueSource(strings = { "/register", "/signup" })
	void registrationRoutesHaveNoServerHandler(String path) {
		Response response = browser().get(path);

		assertThat(response.status()).isEqualTo(404);
		assertThat(response.code()).isEqualTo("NOT_FOUND");
	}

	@Test
	void postingToAnAuthRegisterRouteWithAValidCsrfTokenIs404() {
		Response response = browser().post("/api/v1/auth/register", "{\"username\":\"me\",\"password\":\"x\"}");

		assertThat(response.status()).isEqualTo(404);
		assertThat(response.header("Content-Type")).startsWith("application/problem+json");
		assertThat(response.code()).isEqualTo("NOT_FOUND");
	}

	@ParameterizedTest
	@ValueSource(strings = { "/api/v1/tutor/students", "/api/v1/student/home", "/api/v1/x", "/api" })
	void anonymousCallersGet401OnProtectedAndUnmappedApiPaths(String path) {
		Response response = browser().get(path);

		assertThat(response.status()).isEqualTo(401);
		assertThat(response.code()).isEqualTo("UNAUTHENTICATED");
		assertThat(response.header("Content-Type")).startsWith("application/problem+json");
	}

	@Test
	void theWrongRoleGets403AndAnUnmappedPathStays404ForAnAuthenticatedCaller() {
		student("student.a", false);
		Browser student = signedIn("student.a", false);
		Browser tutor = signedIn("tutor.one", false);

		assertThat(student.get("/api/v1/tutor/students").code()).isEqualTo("FORBIDDEN_ROLE");
		assertThat(student.get("/api/v1/tutor/students").status()).isEqualTo(403);
		assertThat(tutor.get("/api/v1/student/home").code()).isEqualTo("FORBIDDEN_ROLE");
		assertThat(tutor.get("/api/v1/tutor/students").status()).isEqualTo(404);
		assertThat(student.get("/api/v1/student/home").status()).isEqualTo(404);
		assertThat(tutor.get("/api/v1/x").status()).isEqualTo(404);
		assertThat(tutor.get("/api/v1/x").code()).isEqualTo("NOT_FOUND");
	}

	@ParameterizedTest
	@ValueSource(strings = { "POST", "PUT", "PATCH", "DELETE" })
	void stateChangingRequestsWithoutAValidCsrfTokenAre403(String method) {
		Browser tutor = signedIn("tutor.one", false);
		for (String path : List.of("/api/v1/auth/login", "/api/v1/auth/logout", "/api/v1/auth/password",
				"/api/v1/tutor/x", "/api/v1/x", "/tutor")) {
			Response anonymous = browser().send(method, path, "{}", false);
			Response missing = tutor.send(method, path, "{}", false);
			Response wrong = tutor.send(method, path, "{}", "forged-token-value");

			assertThat(List.of(anonymous, missing, wrong)).allSatisfy(response -> {
				assertThat(response.status()).as(method + " " + path).isEqualTo(403);
				assertThat(response.code()).isEqualTo("CSRF_INVALID");
			});
		}
		assertThat(tutor.get("/api/v1/auth/session").status()).as("still signed in").isEqualTo(200);
	}

	@Test
	void disablingAnAccountEndsItsSessionsAndRememberMeAndBlocksLogin() {
		UUID id = student("student.b", false);
		Browser sessionOnly = signedIn("student.b", false);
		Browser remembered = signedIn("student.b", true);
		remembered.cookies.remove(Browser.SESSION);

		accounts.disable(id);

		assertThat(sessionOnly.get("/api/v1/auth/session").status()).isEqualTo(401);
		assertThat(remembered.get("/api/v1/auth/session").status()).isEqualTo(401);
		Response login = browser().login("student.b", PASSWORD, false);
		assertThat(login.status()).isEqualTo(401);
		assertThat(login.bodyWithoutRequestId()).isEqualTo(browser().login("nobody.here", PASSWORD, false).bodyWithoutRequestId());

		accounts.enable(id);
		assertThat(browser().login("student.b", PASSWORD, false).status()).isEqualTo(200);
	}

	// ---- AC11 (audit content) ------------------------------------------------------------------------------

	@Test
	void auditRowsCarryNoPasswordHashTokenOrSessionId() {
		Browser browser = signedIn("tutor.one", true);
		browser().login("tutor.one", "wrong-password-1", false);
		browser.post("/api/v1/auth/password",
				"{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"a-brand-new-secret\"}");
		List<String> secrets = new ArrayList<>(List.of(PASSWORD, "wrong-password-1", "a-brand-new-secret", "$2a$"));
		secrets.add(browser.sessionId());
		secrets.addAll(jdbc.queryForList("SELECT series FROM persistent_logins", String.class));
		secrets.addAll(jdbc.queryForList("SELECT token FROM persistent_logins", String.class));
		secrets.addAll(browser.cookies.values());

		List<String> rows = jdbc.queryForList("SELECT row_to_json(a)::text FROM audit_event a", String.class);

		assertThat(rows).extracting(row -> row.replaceAll(".*\"action\":\"([A-Z_]+)\".*", "$1"))
			.containsExactlyInAnyOrder("LOGIN_SUCCEEDED", "LOGIN_FAILED", "PASSWORD_CHANGED");
		assertThat(rows).allSatisfy(row -> assertThat(row).doesNotContain(secrets));
	}

}
