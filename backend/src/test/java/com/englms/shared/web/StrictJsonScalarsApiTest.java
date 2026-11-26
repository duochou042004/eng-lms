package com.englms.shared.web;

import static com.englms.identity.IdentityFixtures.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.stream.Stream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

import com.englms.MutableClockConfiguration;
import com.englms.TestcontainersConfiguration;
import com.englms.identity.Browser;
import com.englms.identity.Browser.Response;
import com.englms.identity.IdentityFixtures;
import com.englms.identity.Role;
import com.englms.settings.SettingsWorldContributor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;

/**
 * T-M2.33 AC1–AC2 (api-conventions §5, DEC-200 (1)): a {@code String} field binds from a JSON string only and a
 * {@code Boolean} field from a JSON boolean only; anything else is 400 {@code MALFORMED_REQUEST} with the standard
 * problem body, before the controller, and writes nothing. Same context as {@code WorkspaceSettingsApiIntegrationTest}.
 */
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=100000" })
@Import({ TestcontainersConfiguration.class, MutableClockConfiguration.class })
class StrictJsonScalarsApiTest {

	static final String STUDENTS = "/api/v1/tutor/students";

	@LocalServerPort
	int port;

	@Autowired
	JdbcTemplate jdbc;

	Browser tutor;

	String studentId;

	@BeforeEach
	void setUp() {
		SettingsWorldContributor.resetWorkspace(jdbc);
		IdentityFixtures.reset(jdbc);
		IdentityFixtures.insert(jdbc, "tutor.one", PASSWORD, Role.TUTOR, false);
		tutor = new Browser(port);
		assertThat(tutor.login("tutor.one", PASSWORD, false).status()).isEqualTo(200);
		Response created = tutor.post(STUDENTS, "{\"fullName\":\"Student\",\"username\":\"strict.scalar\"}");
		assertThat(created.status()).as(created.body()).isEqualTo(201);
		studentId = created.json().path("student").path("id").asString();
	}

	@AfterEach
	void restoreTheSeed() {
		SettingsWorldContributor.resetWorkspace(jdbc);
	}

	/** Every row a write could touch: accounts, students, the workspace document, audit events and remember-me tokens. */
	String written() {
		return jdbc.queryForObject("""
				SELECT (SELECT coalesce(json_agg(a ORDER BY a.id)::text, '') FROM user_account a)
				    || (SELECT coalesce(json_agg(s ORDER BY s.id)::text, '') FROM student s)
				    || (SELECT value::text || version FROM workspace_setting WHERE key = 'workspace')
				    || (SELECT count(*) FROM audit_event) || '/' || (SELECT count(*) FROM persistent_logins)""",
				String.class);
	}

	/** The standard problem body (api-conventions §5): no detail, no field name, no parser message. */
	static void assertMalformed(Response response, String field) {
		assertThat(response.status()).as(response.body()).isEqualTo(400);
		assertThat(response.header("Content-Type")).startsWith("application/problem+json");
		JsonNode problem = response.json();
		assertThat(problem.propertyNames()).containsExactlyInAnyOrder("type", "title", "status", "instance", "code",
				"requestId");
		assertThat(problem.path("code").asString()).isEqualTo("MALFORMED_REQUEST");
		assertThat(response.bodyWithoutRequestId()).doesNotContain(field, "coerce", "Cannot", "ackson", "String",
				"Boolean");
	}

	// ---- AC1: strict textual ---------------------------------------------------------------------------------

	/** Endpoint, the refused field, the body (a JSON integer, fraction or boolean where a string is expected). */
	static Stream<Arguments> wrongTextual() {
		return Stream.of(Arguments.of("login", "username", "{\"username\":123,\"password\":\"" + PASSWORD + "\"}"),
				Arguments.of("login", "password", "{\"username\":\"tutor.one\",\"password\":123456}"),
				Arguments.of("createStudent", "fullName", "{\"fullName\":123,\"username\":\"strict.other\"}"),
				Arguments.of("createStudent", "username", "{\"fullName\":\"Other\",\"username\":true}"),
				Arguments.of("patchStudent", "fullName", "{\"version\":0,\"fullName\":1.5}"),
				Arguments.of("preferences", "locale", "{\"locale\":123}"),
				Arguments.of("preferences", "displayName", "{\"displayName\":123}"),
				Arguments.of("preferences", "timeZone", "{\"timeZone\":false}"),
				Arguments.of("settings", "displayName", "{\"version\":0,\"displayName\":123}"),
				Arguments.of("settings", "defaultLocale", "{\"version\":0,\"defaultLocale\":true}"));
	}

	@ParameterizedTest(name = "{0} {1}: {2}")
	@MethodSource("wrongTextual")
	void aNonStringForAStringFieldIs400AndWritesNothing(String endpoint, String field, String body) {
		String before = written();

		Response response = switch (endpoint) {
			case "login" -> new Browser(port).post("/api/v1/auth/login", body);
			case "createStudent" -> tutor.post(STUDENTS, body);
			case "patchStudent" -> tutor.send("PATCH", STUDENTS + "/" + studentId, body, true);
			case "preferences" -> tutor.send("PATCH", "/api/v1/auth/preferences", body, true);
			case "settings" -> tutor.send("PATCH", "/api/v1/tutor/settings", body, true);
			default -> throw new IllegalArgumentException(endpoint);
		};

		assertMalformed(response, field);
		assertThat(response.setCookie(Browser.SESSION)).as("no new session").isNull();
		assertThat(written()).as("nothing written").isEqualTo(before);
	}

	// ---- AC2: strict boolean ---------------------------------------------------------------------------------

	@ParameterizedTest(name = "rememberMe: {0}")
	@ValueSource(strings = { "1", "0", "2", "\"true\"", "\"false\"", "\"\"", "\" \"", "1.0" })
	void aNonBooleanRememberMeIs400AndSignsNobodyIn(String rememberMe) {
		Browser browser = new Browser(port);
		String before = written();

		Response response = browser.post("/api/v1/auth/login",
				"{\"username\":\"tutor.one\",\"password\":\"" + PASSWORD + "\",\"rememberMe\":" + rememberMe + "}");

		assertMalformed(response, "rememberMe");
		assertThat(response.setCookie(Browser.SESSION)).as("no session").isNull();
		assertThat(browser.cookies).doesNotContainKeys(Browser.SESSION, Browser.REMEMBER_ME);
		assertThat(written()).as("nothing written").isEqualTo(before);
		assertThat(browser.get("/api/v1/auth/session").status()).isEqualTo(401);
	}

	/** Positive controls: {@code true}, {@code false}, {@code null} and an absent {@code rememberMe} keep their meaning. */
	@Test
	void aBooleanNullOrAbsentRememberMeKeepsItsMeaning() {
		String login = "{\"username\":\"tutor.one\",\"password\":\"" + PASSWORD + "\"";
		for (String member : new String[] { ",\"rememberMe\":false}", ",\"rememberMe\":null}", "}" }) {
			Browser browser = new Browser(port);
			assertThat(browser.post("/api/v1/auth/login", login + member).status()).as(member).isEqualTo(200);
			assertThat(browser.cookies).as(member).containsKey(Browser.SESSION).doesNotContainKey(Browser.REMEMBER_ME);
		}
		assertThat(jdbc.queryForObject("SELECT count(*) FROM persistent_logins", Integer.class)).isZero();

		Browser remembered = new Browser(port);
		assertThat(remembered.post("/api/v1/auth/login", login + ",\"rememberMe\":true}").status()).isEqualTo(200);
		assertThat(remembered.cookies).containsKeys(Browser.SESSION, Browser.REMEMBER_ME);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM persistent_logins", Integer.class)).isOne();
	}

}
