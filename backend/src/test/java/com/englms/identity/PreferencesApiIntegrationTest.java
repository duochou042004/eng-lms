package com.englms.identity;

import static com.englms.identity.IdentityFixtures.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;

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

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import com.englms.TestcontainersConfiguration;
import com.englms.identity.Browser.Response;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * T-M2.6 AC1–AC4 (FR-SET-02, DEC-190): {@code PATCH /api/v1/auth/preferences} over HTTP: the Domain-rules table,
 * the gates, two accounts, and two concurrent writers of different properties.
 */
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=100000" })
@Import(TestcontainersConfiguration.class)
class PreferencesApiIntegrationTest {

	static final String PATH = "/api/v1/auth/preferences";

	static final String LONG_121 = "é".repeat(121);

	@LocalServerPort
	int port;

	@Autowired
	JdbcTemplate jdbc;

	UUID tutorId;

	UUID studentId;

	@BeforeEach
	void setUp() {
		IdentityFixtures.reset(jdbc);
		tutorId = IdentityFixtures.insert(jdbc, "tutor.one", PASSWORD, Role.TUTOR, false);
		studentId = IdentityFixtures.insert(jdbc, "student.a", PASSWORD, Role.STUDENT, false);
	}

	Browser signedIn(String username) {
		Browser browser = new Browser(port);
		assertThat(browser.login(username, PASSWORD, false).status()).isEqualTo(200);
		return browser;
	}

	static Response patch(Browser browser, String json) {
		return browser.send("PATCH", PATH, json, true);
	}

	Map<String, Object> stored(UUID id) {
		return jdbc.queryForMap("SELECT locale, time_zone, display_name FROM user_account WHERE id = ?", id);
	}

	static Map<String, Object> row(String locale, String timeZone, String displayName) {
		HashMap<String, Object> row = new HashMap<>();
		row.put("locale", locale);
		row.put("time_zone", timeZone);
		row.put("display_name", displayName);
		return row;
	}

	/** Who, body, then either the saved row (200) or the 422 field and code; the defaults are vi / Asia/Ho_Chi_Minh / null. */
	static Stream<Arguments> transitions() {
		return Stream.of(
				// valid, each alone and together
				ok("tutor.one", "{\"locale\":\"en\"}", row("en", "Asia/Ho_Chi_Minh", null)),
				ok("tutor.one", "{\"timeZone\":\"Pacific/Kiritimati\"}", row("vi", "Pacific/Kiritimati", null)),
				ok("tutor.one", "{\"timeZone\":\"Asia/Saigon\"}", row("vi", "Asia/Saigon", null)),
				ok("tutor.one", "{\"displayName\":\"  Cô Lan  \"}", row("vi", "Asia/Ho_Chi_Minh", "Cô Lan")),
				ok("tutor.one", "{\"locale\":\"en\",\"timeZone\":\"Europe/Paris\",\"displayName\":\"Ms Lan\"}",
						row("en", "Europe/Paris", "Ms Lan")),
				ok("tutor.one", "{\"displayName\":\"" + "é".repeat(120) + "\"}",
						row("vi", "Asia/Ho_Chi_Minh", "é".repeat(120))),
				// cleared (displayName only)
				ok("tutor.one", "{\"displayName\":\"   \"}", row("vi", "Asia/Ho_Chi_Minh", null)),
				ok("tutor.one", "{\"displayName\":null}", row("vi", "Asia/Ho_Chi_Minh", null)),
				// only the three properties are read (no mass assignment)
				ok("tutor.one", "{\"locale\":\"en\",\"role\":\"STUDENT\",\"mustChangePassword\":true,\"username\":\"x.y\"}",
						row("en", "Asia/Ho_Chi_Minh", null)),
				// a student's own locale and zone
				ok("student.a", "{\"locale\":\"en\",\"timeZone\":\"Asia/Tokyo\"}", row("en", "Asia/Tokyo", null)),
				// invalid
				refused("tutor.one", "{\"locale\":\"fr\"}", "locale", "INVALID_VALUE"),
				refused("tutor.one", "{\"locale\":\"EN\"}", "locale", "INVALID_VALUE"),
				refused("tutor.one", "{\"locale\":\"\"}", "locale", "INVALID_VALUE"),
				refused("tutor.one", "{\"timeZone\":\"Mars/Base\"}", "timeZone", "INVALID_VALUE"),
				refused("tutor.one", "{\"timeZone\":\"asia/ho_chi_minh\"}", "timeZone", "INVALID_VALUE"),
				refused("tutor.one", "{\"displayName\":\"" + LONG_121 + "\"}", "displayName", "TOO_LONG"),
				refused("tutor.one", "{\"displayName\":\"Lan\\u0000\"}", "displayName", "INVALID_FORMAT"),
				refused("tutor.one", "{\"displayName\":\"Lan\\u001b[0m\"}", "displayName", "INVALID_FORMAT"),
				// null where it cannot be cleared
				refused("tutor.one", "{\"locale\":null}", "locale", "REQUIRED"),
				refused("tutor.one", "{\"timeZone\":null}", "timeZone", "REQUIRED"),
				// empty body
				refused("tutor.one", "{}", "locale", "REQUIRED"),
				refused("tutor.one", "{\"unknown\":1}", "locale", "REQUIRED"),
				// a student's displayName, also null or with a valid locale next to it (nothing is saved)
				refused("student.a", "{\"displayName\":\"Lan\"}", "displayName", "INVALID_VALUE"),
				refused("student.a", "{\"displayName\":null}", "displayName", "INVALID_VALUE"),
				refused("student.a", "{\"locale\":\"en\",\"displayName\":\"Lan\"}", "displayName", "INVALID_VALUE"));
	}

	static Arguments ok(String who, String body, Map<String, Object> saved) {
		return Arguments.of(who, body, 200, saved, null, null);
	}

	static Arguments refused(String who, String body, String field, String code) {
		return Arguments.of(who, body, 422, null, field, code);
	}

	@ParameterizedTest(name = "{0} {1} -> {2}")
	@MethodSource("transitions")
	void appliesTheDomainRulesTable(String who, String body, int status, Map<String, Object> saved, String field,
			String code) {
		UUID id = who.equals("tutor.one") ? tutorId : studentId;
		Map<String, Object> before = stored(id);
		Browser browser = signedIn(who);

		Response response = patch(browser, body);

		assertThat(response.status()).as(response.body()).isEqualTo(status);
		if (status == 200) {
			assertThat(stored(id)).isEqualTo(saved);
			assertSessionBody(response, id, saved);
			assertSessionBody(browser.get("/api/v1/auth/session"), id, saved);
			assertThat(browser.get("/api/v1/auth/session").json().path("mustChangePassword").asBoolean()).isFalse();
		}
		else {
			assertThat(response.code()).isEqualTo("VALIDATION_FAILED");
			assertThat(response.json().path("errors").get(0).path("field").asString()).isEqualTo(field);
			assertThat(response.json().path("errors").get(0).path("code").asString()).isEqualTo(code);
			assertThat(stored(id)).isEqualTo(before);
		}
	}

	static void assertSessionBody(Response response, UUID id, Map<String, Object> saved) {
		assertThat(response.status()).isEqualTo(200);
		assertThat(response.json().propertyNames()).containsExactlyInAnyOrder("userId", "username", "role",
				"displayName", "locale", "timeZone", "mustChangePassword");
		assertThat(response.json().path("userId").asString()).isEqualTo(id.toString());
		assertThat(response.json().path("locale").asString()).isEqualTo(saved.get("locale"));
		assertThat(response.json().path("timeZone").asString()).isEqualTo(saved.get("time_zone"));
		if (saved.get("display_name") == null) {
			assertThat(response.json().path("displayName").isNull()).isTrue();
		}
		else {
			assertThat(response.json().path("displayName").asString()).isEqualTo(saved.get("display_name"));
		}
	}

	@Test
	void absentPropertiesStayAndARepeatedPatchIsANoOpWithTheSameBody() {
		Browser tutor = signedIn("tutor.one");
		assertThat(patch(tutor, "{\"displayName\":\"Ms Lan\",\"timeZone\":\"Europe/Paris\"}").status()).isEqualTo(200);

		Response first = patch(tutor, "{\"locale\":\"en\"}");
		Object updatedAt = jdbc.queryForObject("SELECT updated_at FROM user_account WHERE id = ?", Object.class, tutorId);
		Response second = patch(tutor, "{\"locale\":\"en\"}");

		assertThat(stored(tutorId)).isEqualTo(row("en", "Europe/Paris", "Ms Lan"));
		assertThat(second.status()).isEqualTo(200);
		assertThat(second.body()).isEqualTo(first.body());
		assertThat(jdbc.queryForObject("SELECT updated_at FROM user_account WHERE id = ?", Object.class, tutorId))
			.isEqualTo(updatedAt);
	}

	@Test
	void anonymousIs401MustChangeIs403DisabledIs401AndNoCsrfIs403() {
		Response anonymous = patch(new Browser(port), "{\"locale\":\"en\"}");
		assertThat(anonymous.status()).isEqualTo(401);
		assertThat(anonymous.code()).isEqualTo("UNAUTHENTICATED");

		Browser tutor = signedIn("tutor.one");
		for (Response missing : List.of(tutor.send("PATCH", PATH, "{\"locale\":\"en\"}", false),
				tutor.send("PATCH", PATH, "{\"locale\":\"en\"}", "forged-token-value"))) {
			assertThat(missing.status()).isEqualTo(403);
			assertThat(missing.code()).isEqualTo("CSRF_INVALID");
		}

		IdentityFixtures.insert(jdbc, "must.change", PASSWORD, Role.STUDENT, true);
		Response gated = patch(signedIn("must.change"), "{\"locale\":\"en\"}");
		assertThat(gated.status()).isEqualTo(403);
		assertThat(gated.code()).isEqualTo("PASSWORD_CHANGE_REQUIRED");

		Browser student = signedIn("student.a");
		jdbc.update("UPDATE user_account SET status = 'DISABLED' WHERE id = ?", studentId);
		assertThat(patch(student, "{\"locale\":\"en\"}").status()).isEqualTo(401);

		assertThat(jdbc.queryForObject("SELECT count(*) FROM user_account WHERE locale <> 'vi'", Integer.class)).isZero();
	}

	@Test
	void onePatchNeverChangesAnotherAccount() {
		Browser tutor = signedIn("tutor.one");
		Browser student = signedIn("student.a");

		assertThat(patch(student, "{\"locale\":\"en\",\"timeZone\":\"Asia/Tokyo\"}").status()).isEqualTo(200);
		assertThat(stored(tutorId)).isEqualTo(row("vi", "Asia/Ho_Chi_Minh", null));

		assertThat(patch(tutor, "{\"timeZone\":\"Europe/Paris\",\"displayName\":\"Ms Lan\"}").status()).isEqualTo(200);
		assertThat(stored(studentId)).isEqualTo(row("en", "Asia/Tokyo", null));
		assertThat(student.get("/api/v1/auth/session").json().path("timeZone").asString()).isEqualTo("Asia/Tokyo");
		assertThat(tutor.get("/api/v1/auth/session").json().path("locale").asString()).isEqualTo("vi");
	}

	/** DEC-190: last write wins per property; two writers of different properties both keep their change. */
	@Test
	void twoConcurrentPatchesOfDifferentPropertiesBothPersist() throws Exception {
		Browser tabOne = signedIn("tutor.one");
		Browser tabTwo = signedIn("tutor.one");
		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			for (int round = 0; round < 10; round++) {
				String zone = (round % 2 == 0) ? "Europe/Paris" : "Asia/Tokyo";
				String name = "Ms Lan " + round;
				CountDownLatch start = new CountDownLatch(1);
				Callable<Integer> zoneWriter = () -> {
					start.await();
					return patch(tabOne, "{\"timeZone\":\"" + zone + "\"}").status();
				};
				Callable<Integer> nameWriter = () -> {
					start.await();
					return patch(tabTwo, "{\"displayName\":\"" + name + "\"}").status();
				};
				Future<Integer> first = pool.submit(zoneWriter);
				Future<Integer> second = pool.submit(nameWriter);
				start.countDown();

				assertThat(List.of(first.get(30, TimeUnit.SECONDS), second.get(30, TimeUnit.SECONDS)))
					.containsExactly(200, 200);
				assertThat(stored(tutorId)).isEqualTo(row("vi", zone, name));
			}
		}
		finally {
			pool.shutdownNow();
		}
	}

}
