package com.englms.settings;

import static com.englms.identity.IdentityFixtures.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import com.englms.MutableClockConfiguration;
import com.englms.MutableClockConfiguration.MutableClock;
import com.englms.TestcontainersConfiguration;
import com.englms.identity.Browser;
import com.englms.identity.Browser.Response;
import com.englms.identity.IdentityFixtures;
import com.englms.identity.Role;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * T-M2.35 AC1–AC5 (FR-SET-01, DEC-193): {@code GET/PATCH /api/v1/tutor/settings} over HTTP: the Domain-rules table,
 * the order of checks (422, then 409, then the write), the no-op rule, the gates, {@code GET /meta}, one concurrent
 * same-version pair, and new student accounts taking the defaults.
 */
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=100000" })
@Import({ TestcontainersConfiguration.class, MutableClockConfiguration.class })
class WorkspaceSettingsApiIntegrationTest {

	static final String PATH = "/api/v1/tutor/settings";

	static final String SEED = "{\"defaultLocale\": \"vi\", \"defaultTimeZone\": \"Asia/Ho_Chi_Minh\"}";

	@LocalServerPort
	int port;

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	MutableClock clock;

	UUID tutorId;

	@BeforeEach
	void setUp() {
		SettingsWorldContributor.resetWorkspace(jdbc);
		IdentityFixtures.reset(jdbc);
		tutorId = IdentityFixtures.insert(jdbc, "tutor.one", PASSWORD, Role.TUTOR, false);
		IdentityFixtures.insert(jdbc, "student.a", PASSWORD, Role.STUDENT, false);
	}

	@AfterEach
	void restoreTheSeed() {
		// Other test classes share the database and expect the seeded name and defaults.
		SettingsWorldContributor.resetWorkspace(jdbc);
	}

	Browser signedIn(String username) {
		Browser browser = new Browser(port);
		assertThat(browser.login(username, PASSWORD, false).status()).isEqualTo(200);
		return browser;
	}

	static Response patch(Browser browser, String json) {
		return browser.send("PATCH", PATH, json, true);
	}

	/** The stored row: {@code value} as jsonb text, version, updated_at, updated_by. */
	Map<String, Object> stored() {
		return jdbc.queryForMap("SELECT value::text AS value, version, updated_at, updated_by FROM workspace_setting "
				+ "WHERE key = 'workspace'");
	}

	static String doc(String displayName, String locale, String timeZone) {
		return (displayName == null) ? "{\"defaultLocale\": \"" + locale + "\", \"defaultTimeZone\": \"" + timeZone + "\"}"
				: "{\"displayName\": \"" + displayName + "\", \"defaultLocale\": \"" + locale + "\", \"defaultTimeZone\": \""
						+ timeZone + "\"}";
	}

	static void assertBody(Response response, String displayName, String locale, String timeZone, long version) {
		assertThat(response.status()).as(response.body()).isEqualTo(200);
		assertThat(response.json().propertyNames()).containsExactlyInAnyOrder("displayName", "defaultLocale",
				"defaultTimeZone", "version", "updatedAt");
		assertThat(response.json().path("displayName").asString()).isEqualTo(displayName);
		assertThat(response.json().path("defaultLocale").asString()).isEqualTo(locale);
		assertThat(response.json().path("defaultTimeZone").asString()).isEqualTo(timeZone);
		assertThat(response.json().path("version").asLong()).isEqualTo(version);
	}

	@Test
	void theTutorReadsTheSeededSettings() {
		Response response = signedIn("tutor.one").get(PATH);

		assertBody(response, "Eng-LMS", "vi", "Asia/Ho_Chi_Minh", 0);
		assertThat(response.json().path("updatedAt").asString()).isNotEmpty();
		assertThat(jdbc.queryForObject("SELECT value::text FROM workspace_setting WHERE key = 'workspace'", String.class))
			.isEqualTo(SEED);
	}

	/** Body, then the saved document (200, version 1) or the 422 problems as {@code field:code} in order. */
	static Stream<Arguments> transitions() {
		String name120 = "Ă".repeat(120);
		return Stream.of(
				// valid, each alone and together
				ok("{\"version\":0,\"displayName\":\"  Lớp cô Lan  \"}", "Lớp cô Lan", "vi", "Asia/Ho_Chi_Minh"),
				ok("{\"version\":0,\"displayName\":\"Eng-LMS\"}", "Eng-LMS", "vi", "Asia/Ho_Chi_Minh"),
				ok("{\"version\":0,\"displayName\":\"" + name120 + "\"}", name120, "vi", "Asia/Ho_Chi_Minh"),
				ok("{\"version\":0,\"defaultLocale\":\"en\"}", null, "en", "Asia/Ho_Chi_Minh"),
				ok("{\"version\":0,\"defaultTimeZone\":\"Pacific/Kiritimati\"}", null, "vi", "Pacific/Kiritimati"),
				ok("{\"version\":0,\"defaultTimeZone\":\"Asia/Saigon\"}", null, "vi", "Asia/Saigon"),
				ok("{\"version\":0,\"displayName\":\"Ms Lan\",\"defaultLocale\":\"en\",\"defaultTimeZone\":\"Europe/Paris\"}",
						"Ms Lan", "en", "Europe/Paris"),
				// only the four properties are read (no mass assignment)
				ok("{\"version\":0,\"defaultLocale\":\"en\",\"key\":\"other\",\"updatedBy\":\"x\",\"value\":{}}", null, "en",
						"Asia/Ho_Chi_Minh"),
				// displayName
				refused("{\"version\":0,\"displayName\":\"" + "Ă".repeat(121) + "\"}", "displayName:TOO_LONG"),
				refused("{\"version\":0,\"displayName\":\"   \"}", "displayName:REQUIRED"),
				refused("{\"version\":0,\"displayName\":\"\"}", "displayName:REQUIRED"),
				refused("{\"version\":0,\"displayName\":null}", "displayName:REQUIRED"),
				refused("{\"version\":0,\"displayName\":\"Lan\\tclass\"}", "displayName:INVALID_FORMAT"),
				refused("{\"version\":0,\"displayName\":\"Lan\\n\"}", "displayName:INVALID_FORMAT"),
				refused("{\"version\":0,\"displayName\":\"Lan\\u0000\"}", "displayName:INVALID_FORMAT"),
				refused("{\"version\":0,\"displayName\":\"Lan\\u007f\"}", "displayName:INVALID_FORMAT"),
				refused("{\"version\":0,\"displayName\":\"Lan\\u0085\"}", "displayName:INVALID_FORMAT"),
				refused("{\"version\":0,\"displayName\":\"Lan\\u202e\"}", "displayName:INVALID_FORMAT"),
				refused("{\"version\":0,\"displayName\":\"Lan\\u2067\"}", "displayName:INVALID_FORMAT"),
				refused("{\"version\":0,\"displayName\":\"Lan\\u200b\"}", "displayName:INVALID_FORMAT"),
				refused("{\"version\":0,\"displayName\":\"Lan\\u200f\"}", "displayName:INVALID_FORMAT"),
				refused("{\"version\":0,\"displayName\":\"\\ufeffLan\"}", "displayName:INVALID_FORMAT"),
				// defaultLocale
				refused("{\"version\":0,\"defaultLocale\":\"fr\"}", "defaultLocale:INVALID_VALUE"),
				refused("{\"version\":0,\"defaultLocale\":\"EN\"}", "defaultLocale:INVALID_VALUE"),
				refused("{\"version\":0,\"defaultLocale\":null}", "defaultLocale:REQUIRED"),
				// defaultTimeZone
				refused("{\"version\":0,\"defaultTimeZone\":\"Mars/Base\"}", "defaultTimeZone:INVALID_VALUE"),
				refused("{\"version\":0,\"defaultTimeZone\":\"asia/ho_chi_minh\"}", "defaultTimeZone:INVALID_VALUE"),
				refused("{\"version\":0,\"defaultTimeZone\":null}", "defaultTimeZone:REQUIRED"),
				// empty body, version missing or negative; every problem in one 422 (nothing saved with valid ones)
				refused("{\"version\":0}", "displayName:REQUIRED"),
				refused("{}", "version:REQUIRED", "displayName:REQUIRED"),
				refused("{\"defaultLocale\":\"en\"}", "version:REQUIRED"),
				refused("{\"version\":null,\"defaultLocale\":\"en\"}", "version:REQUIRED"),
				refused("{\"version\":-1,\"defaultLocale\":\"en\"}", "version:INVALID_VALUE"),
				refused("{\"version\":-1,\"displayName\":\"\\u202e\",\"defaultLocale\":\"fr\",\"defaultTimeZone\":null}",
						"version:INVALID_VALUE", "displayName:INVALID_FORMAT", "defaultLocale:INVALID_VALUE",
						"defaultTimeZone:REQUIRED"),
				// 422 before 409: a stale version with an invalid body is a 422
				refused("{\"version\":7,\"defaultLocale\":\"fr\"}", "defaultLocale:INVALID_VALUE"));
	}

	static Arguments ok(String body, String displayName, String locale, String timeZone) {
		return Arguments.of(body, 200, doc(displayName, locale, timeZone), List.of());
	}

	static Arguments refused(String body, String... problems) {
		return Arguments.of(body, 422, null, List.of(problems));
	}

	@ParameterizedTest(name = "{0} -> {1}")
	@MethodSource("transitions")
	void appliesTheDomainRulesTable(String body, int status, String saved, List<String> problems) {
		Browser tutor = signedIn("tutor.one");
		Map<String, Object> before = stored();
		clock.advance(Duration.ofMinutes(5));

		Response response = patch(tutor, body);

		assertThat(response.status()).as(response.body()).isEqualTo(status);
		if (status == 200) {
			assertThat(stored().get("value")).isEqualTo(saved);
			assertThat(stored().get("version")).isEqualTo(1L);
			assertThat(stored().get("updated_by")).isEqualTo(tutorId);
			assertThat(((Timestamp) stored().get("updated_at")).toInstant()).isEqualTo(clock.instant());
			assertThat(response.body()).isEqualTo(tutor.get(PATH).body());
			assertThat(response.json().path("updatedAt").asString()).isEqualTo(clock.instant().toString());
		}
		else {
			assertThat(response.code()).isEqualTo("VALIDATION_FAILED");
			List<String> found = new ArrayList<>();
			response.json().path("errors").forEach(e -> found.add(e.path("field").asString() + ":" + e.path("code").asString()));
			assertThat(found).isEqualTo(problems);
			assertThat(stored()).isEqualTo(before);
		}
	}

	@Test
	void aPatchReturnsVersionPlusOneAndGetAndMetaShowTheNewName() {
		Browser tutor = signedIn("tutor.one");

		Response first = patch(tutor, "{\"version\":0,\"displayName\":\"Lớp cô Lan\"}");
		assertBody(first, "Lớp cô Lan", "vi", "Asia/Ho_Chi_Minh", 1);
		Response second = patch(tutor, "{\"version\":1,\"defaultLocale\":\"en\",\"defaultTimeZone\":\"Asia/Tokyo\"}");
		assertBody(second, "Lớp cô Lan", "en", "Asia/Tokyo", 2);

		assertBody(tutor.get(PATH), "Lớp cô Lan", "en", "Asia/Tokyo", 2);
		Response meta = new Browser(port).get("/api/v1/meta");
		assertThat(meta.status()).isEqualTo(200);
		assertThat(meta.json().path("displayName").asString()).isEqualTo("Lớp cô Lan");
		assertThat(meta.json().propertyNames()).containsExactlyInAnyOrder("name", "version", "locales", "displayName");
	}

	/** Values are compared with the stored document: same values write nothing (version, updatedAt, updatedBy stay). */
	@Test
	void aSameValuesPatchWritesNothingButAnExplicitConfiguredNameIsStored() {
		Browser tutor = signedIn("tutor.one");
		Map<String, Object> seeded = stored();

		Response same = patch(tutor, "{\"version\":0,\"defaultLocale\":\"vi\",\"defaultTimeZone\":\"Asia/Ho_Chi_Minh\"}");

		assertBody(same, "Eng-LMS", "vi", "Asia/Ho_Chi_Minh", 0);
		assertThat(same.body()).isEqualTo(tutor.get(PATH).body());
		assertThat(stored()).isEqualTo(seeded);

		// An absent stored name is not equal to an explicit "Eng-LMS": the first explicit name is stored.
		assertBody(patch(tutor, "{\"version\":0,\"displayName\":\"Eng-LMS\"}"), "Eng-LMS", "vi", "Asia/Ho_Chi_Minh", 1);
		Map<String, Object> named = stored();
		assertThat(named.get("value")).isEqualTo(doc("Eng-LMS", "vi", "Asia/Ho_Chi_Minh"));
		clock.advance(Duration.ofMinutes(5));
		assertBody(patch(tutor, "{\"version\":1,\"displayName\":\" Eng-LMS \"}"), "Eng-LMS", "vi", "Asia/Ho_Chi_Minh", 1);
		assertThat(stored()).isEqualTo(named);
	}

	@Test
	void aStaleVersionIs409EvenWithUnchangedValuesAndNothingIsSaved() {
		Browser tutor = signedIn("tutor.one");
		assertThat(patch(tutor, "{\"version\":0,\"defaultLocale\":\"en\"}").status()).isEqualTo(200);
		Map<String, Object> before = stored();

		for (String body : List.of("{\"version\":0,\"defaultLocale\":\"en\"}", "{\"version\":0,\"defaultLocale\":\"vi\"}",
				"{\"version\":5,\"displayName\":\"Other\"}")) {
			Response stale = patch(tutor, body);
			assertThat(stale.status()).as(body).isEqualTo(409);
			assertThat(stale.code()).isEqualTo("STALE_VERSION");
			assertThat(stored()).isEqualTo(before);
		}
	}

	@Test
	void wrongJsonTypesAre400() {
		Browser tutor = signedIn("tutor.one");
		Map<String, Object> before = stored();
		for (String body : List.of("{\"version\":0,\"displayName\":{}}", "{\"version\":0,\"defaultLocale\":[\"en\"]}",
				"{\"version\":{},\"defaultLocale\":\"en\"}", "[]")) {
			Response response = patch(tutor, body);
			assertThat(response.status()).as(body).isEqualTo(400);
			assertThat(response.code()).isEqualTo("MALFORMED_REQUEST");
		}
		assertThat(stored()).isEqualTo(before);
	}

	@Test
	void studentIs403MustChangeIs403AnonymousIs401AndNoCsrfIs403() {
		String body = "{\"version\":0,\"defaultLocale\":\"en\"}";
		Response anonymous = patch(new Browser(port), body);
		assertThat(anonymous.status()).isEqualTo(401);
		assertThat(new Browser(port).get(PATH).status()).isEqualTo(401);

		Browser student = signedIn("student.a");
		assertThat(student.get(PATH).status()).isEqualTo(403);
		assertThat(patch(student, body).status()).isEqualTo(403);

		Browser tutor = signedIn("tutor.one");
		for (Response missing : List.of(tutor.send("PATCH", PATH, body, false),
				tutor.send("PATCH", PATH, body, "forged-token-value"))) {
			assertThat(missing.status()).isEqualTo(403);
			assertThat(missing.code()).isEqualTo("CSRF_INVALID");
		}

		// The single tutor with a password to change (the matrix's must-change actor is a student).
		jdbc.update("UPDATE user_account SET must_change_password = true WHERE id = ?", tutorId);
		Browser gated = signedIn("tutor.one");
		for (Response response : List.of(gated.get(PATH), patch(gated, body))) {
			assertThat(response.status()).isEqualTo(403);
			assertThat(response.code()).isEqualTo("PASSWORD_CHANGE_REQUIRED");
		}

		assertThat(stored().get("version")).isEqualTo(0L);
		assertThat(new Browser(port).get("/api/v1/meta").status()).isEqualTo(200);
	}

	static final List<String> ZONES = List.of("Asia/Tokyo", "Europe/Paris", "Europe/Berlin", "America/New_York",
			"Australia/Sydney");

	/** Two writers with the same version and different values: exactly one wins, once. */
	@Test
	void twoConcurrentSameVersionPatchesGiveOne200AndOne409() throws Exception {
		Browser tabOne = signedIn("tutor.one");
		Browser tabTwo = signedIn("tutor.one");
		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			for (int round = 0; round < 5; round++) {
				long version = round;
				String one = "{\"version\":" + version + ",\"displayName\":\"Tab one " + round + "\"}";
				// Values new in every round: a same-values PATCH would be a no-op 200 (no write, no version check at flush).
				String two = "{\"version\":" + version + ",\"defaultTimeZone\":\"" + ZONES.get(round) + "\"}";
				CountDownLatch start = new CountDownLatch(1);
				Callable<Response> first = () -> {
					start.await();
					return patch(tabOne, one);
				};
				Callable<Response> second = () -> {
					start.await();
					return patch(tabTwo, two);
				};
				Future<Response> a = pool.submit(first);
				Future<Response> b = pool.submit(second);
				start.countDown();
				Response ra = a.get(30, TimeUnit.SECONDS);
				Response rb = b.get(30, TimeUnit.SECONDS);

				assertThat(List.of(ra.status(), rb.status())).containsExactlyInAnyOrder(200, 409);
				Response winner = (ra.status() == 200) ? ra : rb;
				Response loser = (ra.status() == 200) ? rb : ra;
				assertThat(loser.code()).isEqualTo("STALE_VERSION");
				assertThat(stored().get("version")).isEqualTo(version + 1);
				assertThat(winner.json().path("version").asLong()).isEqualTo(version + 1);
				assertThat(tabOne.get(PATH).body()).isEqualTo(winner.body());
			}
		}
		finally {
			pool.shutdownNow();
		}
	}

	/** The invariant: the app never inserts the row; without it every read and write is a 500 without detail. */
	@Test
	void aMissingWorkspaceRowIsA500AndIsNeverInserted() {
		Browser tutor = signedIn("tutor.one");
		jdbc.update("DELETE FROM workspace_setting WHERE key = 'workspace'");
		try {
			for (Response response : List.of(tutor.get(PATH), patch(tutor, "{\"version\":0,\"defaultLocale\":\"en\"}"),
					new Browser(port).get("/api/v1/meta"))) {
				assertThat(response.status()).isEqualTo(500);
				assertThat(response.code()).isEqualTo("INTERNAL_ERROR");
				assertThat(response.body()).doesNotContain("workspace_setting").doesNotContain("missing");
			}
			assertThat(tutor.send("POST", "/api/v1/tutor/students",
					"{\"fullName\":\"Học viên\",\"username\":\"student.none\"}", true).status()).isEqualTo(500);
			assertThat(jdbc.queryForObject("SELECT count(*) FROM workspace_setting", Integer.class)).isZero();
			assertThat(jdbc.queryForObject("SELECT count(*) FROM user_account WHERE username = 'student.none'",
					Integer.class)).isZero();
		}
		finally {
			jdbc.update("INSERT INTO workspace_setting (key, value, updated_at) VALUES ('workspace', ?::jsonb, now())", SEED);
		}
	}

	/** AC5: students created after a defaults change carry them; earlier ones and the tutor keep theirs. */
	@Test
	void newStudentAccountsTakeTheDefaultsAndExistingAccountsKeepTheirs() {
		Browser tutor = signedIn("tutor.one");
		Map<String, String> before = createStudent(tutor, "Học viên Trước", "student.before");

		assertThat(patch(tutor, "{\"version\":0,\"defaultLocale\":\"en\",\"defaultTimeZone\":\"Pacific/Kiritimati\"}")
			.status()).isEqualTo(200);
		Map<String, String> after = createStudent(tutor, "Học viên Sau", "student.after");

		assertThat(session(after)).containsEntry("locale", "en").containsEntry("timeZone", "Pacific/Kiritimati");
		assertThat(session(before)).containsEntry("locale", "vi").containsEntry("timeZone", "Asia/Ho_Chi_Minh");
		Response me = tutor.get("/api/v1/auth/session");
		assertThat(me.json().path("locale").asString()).isEqualTo("vi");
		assertThat(me.json().path("timeZone").asString()).isEqualTo("Asia/Ho_Chi_Minh");
		assertThat(jdbc.queryForMap("SELECT locale, time_zone FROM user_account WHERE id = ?", tutorId))
			.containsEntry("locale", "vi")
			.containsEntry("time_zone", "Asia/Ho_Chi_Minh");
	}

	private Map<String, String> createStudent(Browser tutor, String fullName, String username) {
		Response created = tutor.send("POST", "/api/v1/tutor/students",
				"{\"fullName\":" + Browser.quote(fullName) + ",\"username\":" + Browser.quote(username) + "}", true);
		assertThat(created.status()).as(created.body()).isEqualTo(201);
		Map<String, String> credentials = new HashMap<>();
		credentials.put("username", username);
		credentials.put("password", created.json().path("credentials").path("temporaryPassword").asString());
		return credentials;
	}

	/** The student's own session body after signing in with the temporary password (the must-change gate lets it through). */
	private Map<String, String> session(Map<String, String> credentials) {
		Browser student = new Browser(port);
		Response login = student.login(credentials.get("username"), credentials.get("password"), false);
		assertThat(login.status()).as(login.body()).isEqualTo(200);
		Response session = student.get("/api/v1/auth/session");
		return Map.of("locale", session.json().path("locale").asString(), "timeZone",
				session.json().path("timeZone").asString());
	}

}
