package com.englms.settings;

import static com.englms.identity.IdentityFixtures.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestInstance.Lifecycle;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import com.englms.MutableClockConfiguration;
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
import tools.jackson.databind.JsonNode;

/**
 * T-M2.33 AC4 (DEC-200 (2), validation-rules "workspace" and "account" {@code displayName}): one character rule for the
 * workspace name ({@code PATCH /tutor/settings}) and the tutor's display name ({@code PATCH /auth/preferences}). A
 * {@code [\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]} code point anywhere is 422 {@code INVALID_FORMAT} whose message names the first
 * one as {@code U+XXXX} and never the value; nothing is saved. One sign-in for the class (the rows are many); same
 * context as {@code WorkspaceSettingsApiIntegrationTest}.
 */
@Tag("container")
@TestInstance(Lifecycle.PER_CLASS)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=100000" })
@Import({ TestcontainersConfiguration.class, MutableClockConfiguration.class })
class NameRuleApiTest {

	static final String WORKSPACE = "/api/v1/tutor/settings";

	static final String ACCOUNT = "/api/v1/auth/preferences";

	static final int[] REFUSED = { 0x0009, 0x000A, 0x000D, 0x007F, 0x0085, 0x00AD, 0x061C, 0x180E, 0x200B, 0x200D,
			0x200E, 0x2028, 0x2029, 0x202E, 0x2060, 0x2064, 0x2066, 0xFEFF, 0xE0041, 0xD800 };

	@LocalServerPort
	int port;

	@Autowired
	JdbcTemplate jdbc;

	Browser tutor;

	@BeforeAll
	void signIn() {
		SettingsWorldContributor.resetWorkspace(jdbc);
		IdentityFixtures.reset(jdbc);
		IdentityFixtures.insert(jdbc, "tutor.one", PASSWORD, Role.TUTOR, false);
		tutor = new Browser(port);
		assertThat(tutor.login("tutor.one", PASSWORD, false).status()).isEqualTo(200);
	}

	@AfterAll
	void restoreTheSeed() {
		SettingsWorldContributor.resetWorkspace(jdbc);
	}

	/** A JSON string literal with every non-printable-ASCII UTF-16 unit escaped, so a lone surrogate reaches the server. */
	static String json(String value) {
		StringBuilder out = new StringBuilder("\"");
		for (char c : value.toCharArray()) {
			out.append((c < 0x20 || c > 0x7E || c == '"' || c == '\\') ? String.format("\\u%04x", (int) c) : c);
		}
		return out.append('"').toString();
	}

	static String hex(int codePoint) {
		return String.format("U+%04X", codePoint);
	}

	/** Endpoint, the sent name, the code point the message names: every refused code point at the start, middle and end. */
	static Stream<Arguments> refused() {
		List<Arguments> rows = new ArrayList<>();
		for (String endpoint : List.of(WORKSPACE, ACCOUNT)) {
			for (int cp : REFUSED) {
				String c = Character.toString(cp);
				rows.add(Arguments.of(endpoint, c + "Lan Anh", hex(cp)));
				rows.add(Arguments.of(endpoint, "Lan" + c + "Anh", hex(cp)));
				rows.add(Arguments.of(endpoint, "Lan Anh" + c, hex(cp)));
			}
			// several: the first one is named (a tag character as one code point, not its surrogates)
			rows.add(Arguments.of(endpoint, "A\u200BB\u202EC", "U+200B"));
			rows.add(Arguments.of(endpoint, "\u202E\u200B", "U+202E"));
			rows.add(Arguments.of(endpoint, "Lan\uDB40\uDC41\u200B", "U+E0041"));
		}
		return rows.stream();
	}

	String stored(String endpoint) {
		return endpoint.equals(WORKSPACE)
				? jdbc.queryForObject("SELECT value::text || version FROM workspace_setting WHERE key = 'workspace'",
						String.class)
				: jdbc.queryForObject("SELECT coalesce(display_name, '<null>') FROM user_account", String.class);
	}

	Response patch(String endpoint, String name) {
		String version = endpoint.equals(WORKSPACE) ? "\"version\":" + tutor.get(WORKSPACE).json().path("version").asLong() + ","
				: "";
		return tutor.send("PATCH", endpoint, "{" + version + "\"displayName\":" + json(name) + "}", true);
	}

	@ParameterizedTest(name = "{0} {2} in {1}")
	@MethodSource("refused")
	void aForbiddenCodePointIs422NamingTheFirstAndNothingIsSaved(String endpoint, String name, String named) {
		String before = stored(endpoint);

		Response response = patch(endpoint, name);

		assertThat(response.status()).as(response.body()).isEqualTo(422);
		assertThat(response.code()).isEqualTo("VALIDATION_FAILED");
		JsonNode errors = response.json().path("errors");
		assertThat(errors).hasSize(1);
		assertThat(errors.get(0).path("field").asString()).isEqualTo("displayName");
		assertThat(errors.get(0).path("code").asString()).isEqualTo("INVALID_FORMAT");
		String message = errors.get(0).path("message").asString();
		assertThat(message).contains(named);
		assertThat(message.replaceAll("U\\+[0-9A-F]{4,6}", "")).as("one code point named").doesNotContain("U+");
		assertThat(response.body()).as("no value echo").doesNotContain("Lan", "Anh");
		assertThat(stored(endpoint)).as("nothing saved").isEqualTo(before);
	}

	/** Endpoint, the sent name, the stored name: marks, an emoji with U+FE0F and an interior space stay; both ends stripped. */
	static Stream<Arguments> accepted() {
		List<Arguments> rows = new ArrayList<>();
		for (String endpoint : List.of(WORKSPACE, ACCOUNT)) {
			rows.add(Arguments.of(endpoint, "Lớp cô Lan", "Lớp cô Lan"));
			rows.add(Arguments.of(endpoint, "Lé Lan", "Lé Lan"));
			rows.add(Arguments.of(endpoint, "Lan ❤️", "Lan ❤️"));
			rows.add(Arguments.of(endpoint, "Ms Lan", "Ms Lan"));
			rows.add(Arguments.of(endpoint, " Lan ", "Lan"));
			rows.add(Arguments.of(endpoint, " 　Lan Anh  ", "Lan Anh"));
		}
		return rows.stream();
	}

	@ParameterizedTest(name = "{0} {1} -> {2}")
	@MethodSource("accepted")
	void aNameWithoutForbiddenCodePointsIsStoredStripped(String endpoint, String name, String saved) {
		patch(endpoint, "Before");

		Response response = patch(endpoint, name);

		assertThat(response.status()).as(response.body()).isEqualTo(200);
		assertThat(response.json().path("displayName").asString()).isEqualTo(saved);
		assertThat(tutor.get(endpoint.equals(WORKSPACE) ? WORKSPACE : "/api/v1/auth/session").json()
			.path("displayName")
			.asString()).isEqualTo(saved);
	}

	/** Endpoint, a name of only space separators or whitespace: the workspace name is required, the account name is cleared. */
	static Stream<Arguments> blank() {
		List<Arguments> rows = new ArrayList<>();
		for (String endpoint : List.of(WORKSPACE, ACCOUNT)) {
			for (String name : List.of(" ", "　", "   ", "    ")) {
				rows.add(Arguments.of(endpoint, name));
			}
		}
		return rows.stream();
	}

	@ParameterizedTest(name = "{0} {1}")
	@MethodSource("blank")
	void aBlankNameIsRequiredOnTheWorkspaceAndClearsTheAccountName(String endpoint, String name) {
		assertThat(patch(endpoint, "Before").status()).isEqualTo(200);
		String before = stored(endpoint);

		Response response = patch(endpoint, name);

		if (endpoint.equals(WORKSPACE)) {
			assertThat(response.status()).as(response.body()).isEqualTo(422);
			assertThat(response.json().path("errors")).hasSize(1);
			assertThat(response.json().path("errors").get(0).path("field").asString()).isEqualTo("displayName");
			assertThat(response.json().path("errors").get(0).path("code").asString()).isEqualTo("REQUIRED");
			assertThat(stored(endpoint)).isEqualTo(before);
		}
		else {
			assertThat(response.status()).as(response.body()).isEqualTo(200);
			assertThat(response.json().path("displayName").isNull()).isTrue();
			assertThat(stored(endpoint)).isEqualTo("<null>");
		}
	}

}
