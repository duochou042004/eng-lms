package com.englms.students;

import static com.englms.identity.Browser.quote;
import static com.englms.identity.IdentityFixtures.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
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
import tools.jackson.databind.JsonNode;

/**
 * T-M2.10 AC1–AC4 (T-M2.9 QA F3, api-conventions §5, validation-rules {@code version}): a {@code version} that is not a
 * JSON integer is a wrong JSON type, 400 {@code MALFORMED_REQUEST} with the standard problem body, on one endpoint of
 * each kind; the row is unchanged. An integer {@code version} keeps its meaning (200, or 409 {@code STALE_VERSION}).
 * {@code true} was refused before T-M2.10 too and stays as a regression row. Same context as
 * {@link GuardiansAndLearningProfileApiTest}.
 */
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=100000",
				"spring.jpa.properties.hibernate.generate_statistics=true" })
@Import({ TestcontainersConfiguration.class, MutableClockConfiguration.class })
class StrictJsonIntegersApiTest {

	static final String STUDENTS = "/api/v1/tutor/students";

	static final String GUARDIANS = "/api/v1/tutor/guardians";

	/** A value the refused body tries to write; never stored, never echoed. */
	static final String MARKER = "REFUSED-T-M2.10";

	/**
	 * Refused {@code version} values: fractions and exponents (Jackson truncated them to a long), numeric, empty and blank
	 * strings (coerced to a number or {@code null}), and the regression row {@code true} (refused before T-M2.10).
	 */
	static List<String> refusedVersions() {
		return List.of("0.7", "3.9", "1.0", "0.0", "1e0", "1e2", "\"1\"", "\"0\"", "\"\"", "\" \"", "true");
	}

	@LocalServerPort
	int port;

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	MutableClock clock;

	Browser tutor;

	@BeforeEach
	void setUp() {
		clock.set(GuardiansAndLearningProfileApiTest.NOW);
		IdentityFixtures.reset(jdbc);
		IdentityFixtures.insert(jdbc, "tutor.one", PASSWORD, Role.TUTOR, false);
		tutor = new Browser(port);
		assertThat(tutor.login("tutor.one", PASSWORD, false).status()).isEqualTo(200);
	}

	String createStudent(String username) {
		Response response = tutor.post(STUDENTS, "{\"fullName\":\"Student\",\"username\":" + quote(username) + "}");
		assertThat(response.status()).as(response.body()).isEqualTo(201);
		return response.json().path("student").path("id").asString();
	}

	String addGuardian(String sid) {
		Response response = tutor.post(STUDENTS + "/" + sid + "/guardians", "{\"name\":\"Guardian\"}");
		assertThat(response.status()).as(response.body()).isEqualTo(201);
		return response.json().path("id").asString();
	}

	Response patchStudent(String sid, String version) {
		return tutor.send("PATCH", STUDENTS + "/" + sid, "{\"version\":" + version + ",\"note\":\"" + MARKER + "\"}", true);
	}

	Response patchGuardian(String gid, String version) {
		return tutor.send("PATCH", GUARDIANS + "/" + gid, "{\"version\":" + version + ",\"notes\":\"" + MARKER + "\"}",
				true);
	}

	Response putProfile(String sid, String versionMember) {
		String body = "{" + versionMember + (versionMember.isEmpty() ? "" : ",") + "\"currentLevel\":\"" + MARKER + "\"}";
		return tutor.send("PUT", STUDENTS + "/" + sid + "/learning-profile", body, true);
	}

	/** The whole row as JSON text (every column, arrays and jsonb included), to compare before and after. */
	String row(String table, String id) {
		return jdbc.queryForObject("SELECT to_jsonb(t)::text FROM " + table + " t WHERE id = ?", String.class,
				UUID.fromString(id));
	}

	String profileRow(String sid) {
		return jdbc.queryForObject("SELECT to_jsonb(t)::text FROM student_learning_profile t WHERE student_id = ?",
				String.class, UUID.fromString(sid));
	}

	int profiles() {
		return jdbc.queryForObject("SELECT count(*) FROM student_learning_profile", Integer.class);
	}

	/** The standard problem body (api-conventions §5): no detail, no field or input echo, no parser message. */
	static void assertMalformed(Response response, String value) {
		assertThat(response.status()).as("version %s: %s", value, response.body()).isEqualTo(400);
		assertThat(response.header("Content-Type")).startsWith("application/problem+json");
		JsonNode problem = response.json();
		assertThat(problem.propertyNames()).containsExactlyInAnyOrder("type", "title", "status", "instance", "code",
				"requestId");
		assertThat(problem.path("code").asString()).isEqualTo("MALFORMED_REQUEST");
		assertThat(problem.path("status").asInt()).isEqualTo(400);
		assertThat(problem.path("requestId").asString()).matches("[0-9a-f-]{36}")
			.isEqualTo(response.header("X-Request-Id"));
		assertThat(response.body()).doesNotContain(MARKER, "version", "coerce", "Cannot", "ackson", "Long");
	}

	// ---- AC1: student PATCH ----------------------------------------------------------------------------------

	@ParameterizedTest
	@MethodSource("refusedVersions")
	void aNonIntegerVersionOnTheStudentPatchIs400AndChangesNothing(String version) {
		String sid = createStudent("strict.student");
		String before = row("student", sid);

		assertMalformed(patchStudent(sid, version), version);

		assertThat(row("student", sid)).as("student row after version %s", version).isEqualTo(before);
		assertThat(tutor.get(STUDENTS + "/" + sid).json().path("version").asLong()).isZero();
	}

	// ---- AC2: guardian PATCH ---------------------------------------------------------------------------------

	@ParameterizedTest
	@MethodSource("refusedVersions")
	void aNonIntegerVersionOnTheGuardianPatchIs400AndChangesNothing(String version) {
		String gid = addGuardian(createStudent("strict.guardian"));
		String before = row("student_guardian", gid);

		assertMalformed(patchGuardian(gid, version), version);

		assertThat(row("student_guardian", gid)).as("guardian row after version %s", version).isEqualTo(before);
	}

	// ---- AC3: learning-profile PUT ---------------------------------------------------------------------------

	@ParameterizedTest
	@MethodSource("refusedVersions")
	void aNonIntegerVersionOnAnExistingProfileIs400AndChangesNothing(String version) {
		String sid = createStudent("strict.profile");
		assertThat(putProfile(sid, "\"version\":null").status()).isEqualTo(200);
		String before = profileRow(sid);

		assertMalformed(putProfile(sid, "\"version\":" + version), version);

		assertThat(profileRow(sid)).as("profile row after version %s", version).isEqualTo(before);
		assertThat(profiles()).isOne();
	}

	@ParameterizedTest
	@MethodSource("refusedVersions")
	void aNonIntegerVersionOnTheFirstPutIs400AndCreatesNothing(String version) {
		String sid = createStudent("strict.first");

		assertMalformed(putProfile(sid, "\"version\":" + version), version);

		assertThat(profiles()).as("no profile after version %s", version).isZero();
	}

	@Test
	void aNullOrAbsentVersionStillCreatesTheFirstProfile() {
		String nullVersion = createStudent("first.null");
		String absentVersion = createStudent("first.absent");

		Response created = putProfile(nullVersion, "\"version\":null");
		Response createdWithout = putProfile(absentVersion, "");

		assertThat(created.status()).as(created.body()).isEqualTo(200);
		assertThat(createdWithout.status()).as(createdWithout.body()).isEqualTo(200);
		assertThat(created.json().path("version").isIntegralNumber()).isTrue();
		assertThat(createdWithout.json().path("currentLevel").asString()).isEqualTo(MARKER);
		assertThat(profiles()).isEqualTo(2);
	}

	// ---- AC4: positive controls ------------------------------------------------------------------------------

	@Test
	void anIntegerVersionStillUpdatesTheStudentAndAStaleOneIs409() {
		String sid = createStudent("control.student");

		Response updated = patchStudent(sid, "0");
		Response stale = patchStudent(sid, "0");

		assertThat(updated.status()).as(updated.body()).isEqualTo(200);
		assertThat(updated.json().path("note").asString()).isEqualTo(MARKER);
		assertThat(updated.json().path("version").asLong()).isEqualTo(1);
		assertThat(stale.status()).isEqualTo(409);
		assertThat(stale.code()).isEqualTo("STALE_VERSION");
	}

	@Test
	void anIntegerVersionStillUpdatesTheGuardianAndAStaleOneIs409() {
		String gid = addGuardian(createStudent("control.guardian"));

		Response updated = patchGuardian(gid, "0");
		Response stale = patchGuardian(gid, "0");

		assertThat(updated.status()).as(updated.body()).isEqualTo(200);
		assertThat(updated.json().path("notes").asString()).isEqualTo(MARKER);
		assertThat(updated.json().path("version").asLong()).isEqualTo(1);
		assertThat(stale.status()).isEqualTo(409);
		assertThat(stale.code()).isEqualTo("STALE_VERSION");
	}

	@Test
	void anIntegerVersionStillReplacesTheProfileAndAStaleOneIs409() {
		String sid = createStudent("control.profile");
		long version = putProfile(sid, "\"version\":null").json().path("version").asLong();
		tutor.send("PUT", STUDENTS + "/" + sid + "/learning-profile", "{\"version\":" + version + ",\"currentLevel\":\"B1\"}",
				true);

		Response stale = putProfile(sid, "\"version\":" + version);
		Response current = putProfile(sid, "\"version\":" + (version + 1));

		assertThat(stale.status()).isEqualTo(409);
		assertThat(stale.code()).isEqualTo("STALE_VERSION");
		assertThat(current.status()).as(current.body()).isEqualTo(200);
		assertThat(current.json().path("currentLevel").asString()).isEqualTo(MARKER);
		assertThat(current.json().path("version").asLong()).isEqualTo(version + 2);
	}

}
