package com.englms.students;

import static com.englms.identity.Browser.quote;
import static com.englms.identity.IdentityFixtures.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

import jakarta.persistence.EntityManagerFactory;

import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

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
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;

/**
 * T-M2.9 AC1–AC3 and AC9 (logs) over HTTP on the real port: guardians (FR-STU-03), guardians at create (FR-STU-01) and
 * the tutor-private learning profile (FR-STU-04). Same context as {@link StudentsApiIntegrationTest}.
 */
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=100000",
				"spring.jpa.properties.hibernate.generate_statistics=true" })
@Import({ TestcontainersConfiguration.class, MutableClockConfiguration.class })
@ExtendWith(OutputCaptureExtension.class)
class GuardiansAndLearningProfileApiTest {

	static final Instant NOW = Instant.parse("2026-10-09T03:00:00Z");

	static final String STUDENTS = "/api/v1/tutor/students";

	static final String GUARDIANS = "/api/v1/tutor/guardians";

	@LocalServerPort
	int port;

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	MutableClock clock;

	@Autowired
	EntityManagerFactory entityManagerFactory;

	Browser tutor;

	@BeforeEach
	void setUp() {
		clock.set(NOW);
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

	Response addGuardian(String sid, String json) {
		return tutor.post(STUDENTS + "/" + sid + "/guardians", json);
	}

	Response guardians(String sid) {
		return tutor.get(STUDENTS + "/" + sid + "/guardians");
	}

	List<String> names(Response list) {
		List<String> names = new ArrayList<>();
		list.json().forEach(guardian -> names.add(guardian.path("name").asString()));
		return names;
	}

	Response patchGuardian(String gid, String json) {
		return tutor.send("PATCH", GUARDIANS + "/" + gid, json, true);
	}

	Response profile(String sid) {
		return tutor.get(STUDENTS + "/" + sid + "/learning-profile");
	}

	Response putProfile(String sid, String json) {
		return tutor.send("PUT", STUDENTS + "/" + sid + "/learning-profile", json, true);
	}

	int count(String sql, Object... args) {
		return jdbc.queryForObject(sql, Integer.class, args);
	}

	static List<String> fieldCodes(Response response) {
		List<String> codes = new ArrayList<>();
		response.json().path("errors").forEach(e -> codes.add(e.path("field").asString() + ":" + e.path("code").asString()));
		return codes;
	}

	// ---- AC1: guardians ----------------------------------------------------------------------------------------

	@Test
	void guardiansAreAddedListedInInsertionOrderUpdatedAndDeleted() {
		String sid = createStudent("guarded");

		Response first = addGuardian(sid, "{\"name\":\" Trần Thị Mai \",\"relationship\":\"Mẹ\",\"phone\":\"0901 234 567\","
				+ "\"email\":\"mai@example.org\",\"notes\":\"Call after 6 pm\"}");
		Response second = addGuardian(sid, "{\"name\":\"Nguyễn Văn Bố\"}");

		assertThat(first.status()).isEqualTo(201);
		JsonNode created = first.json();
		assertThat(first.header("Location")).isEqualTo(GUARDIANS + "/" + created.path("id").asString());
		assertThat(created.propertyNames()).containsExactlyInAnyOrder("id", "name", "relationship", "phone", "email",
				"notes", "version");
		assertThat(created.path("name").asString()).isEqualTo("Trần Thị Mai");
		assertThat(created.path("version").asLong()).isZero();
		assertThat(second.json().path("relationship").isNull()).isTrue();
		assertThat(names(guardians(sid))).containsExactly("Trần Thị Mai", "Nguyễn Văn Bố");

		String gid = created.path("id").asString();
		Response updated = patchGuardian(gid, "{\"version\":0,\"phone\":null,\"relationship\":\"Mother\"}");
		assertThat(updated.status()).isEqualTo(200);
		assertThat(updated.json().path("phone").isNull()).isTrue();
		assertThat(updated.json().path("relationship").asString()).isEqualTo("Mother");
		assertThat(updated.json().path("name").asString()).as("absent = unchanged").isEqualTo("Trần Thị Mai");
		assertThat(updated.json().path("email").asString()).isEqualTo("mai@example.org");
		assertThat(updated.json().path("version").asLong()).isEqualTo(1);
		assertThat(patchGuardian(gid, "{\"version\":1,\"relationship\":\"Mother\"}").json().path("version").asLong())
			.as("no change keeps the version")
			.isEqualTo(1);

		assertThat(fieldCodes(patchGuardian(gid, "{\"version\":1,\"name\":null}"))).containsExactly("name:REQUIRED");
		assertThat(fieldCodes(patchGuardian(gid, "{\"notes\":\"x\"}"))).containsExactly("version:REQUIRED");
		assertThat(fieldCodes(patchGuardian(gid, "{\"version\":-1}"))).containsExactly("version:INVALID_VALUE");
		Response stale = patchGuardian(gid, "{\"version\":0,\"notes\":\"late\"}");
		assertThat(stale.status()).isEqualTo(409);
		assertThat(stale.code()).isEqualTo("STALE_VERSION");

		assertThat(tutor.send("DELETE", GUARDIANS + "/" + gid, null, true).status()).isEqualTo(204);
		assertThat(names(guardians(sid))).containsExactly("Nguyễn Văn Bố");
		assertThat(tutor.send("DELETE", GUARDIANS + "/" + second.json().path("id").asString(), null, true).status())
			.isEqualTo(204);
		Response empty = guardians(sid);
		assertThat(empty.status()).isEqualTo(200);
		assertThat(empty.json().isArray()).isTrue();
		assertThat(empty.json().size()).isZero();
		assertThat(tutor.send("DELETE", GUARDIANS + "/" + gid, null, true).status()).isEqualTo(404);
	}

	@Test
	void positionsAreNotCompactedAndANewGuardianGoesLast() {
		String sid = createStudent("positions");
		String a = addGuardian(sid, "{\"name\":\"A\"}").json().path("id").asString();
		addGuardian(sid, "{\"name\":\"B\"}");
		tutor.send("DELETE", GUARDIANS + "/" + a, null, true);
		addGuardian(sid, "{\"name\":\"C\"}");

		assertThat(names(guardians(sid))).containsExactly("B", "C");
		assertThat(jdbc.queryForList("SELECT position FROM student_guardian ORDER BY position", Integer.class))
			.containsExactly(2, 3);
	}

	@Test
	void invalidGuardianFieldsAre422WithFieldCodes() {
		String sid = createStudent("invalid.guardian");

		Response response = addGuardian(sid, "{\"name\":\"  \",\"relationship\":\"" + "r".repeat(41)
				+ "\",\"phone\":\"12ab\",\"email\":\"not-an-email\",\"notes\":\"" + "n".repeat(2001) + "\"}");

		assertThat(response.status()).isEqualTo(422);
		assertThat(fieldCodes(response)).containsExactlyInAnyOrder("name:REQUIRED", "relationship:TOO_LONG",
				"phone:INVALID_FORMAT", "email:INVALID_FORMAT", "notes:TOO_LONG");
		assertThat(fieldCodes(addGuardian(sid, "{\"name\":\"" + "x".repeat(121) + "\"}"))).containsExactly("name:TOO_LONG");
		assertThat(fieldCodes(addGuardian(sid, "{\"name\":\"Mai\\u0000\",\"notes\":\"a\\u0000b\"}")))
			.containsExactlyInAnyOrder("name:INVALID_FORMAT", "notes:INVALID_FORMAT");
		assertThat(fieldCodes(addGuardian(sid, "{\"name\":\"Mai\",\"relationship\":\"m\\u001b\"}")))
			.containsExactly("relationship:INVALID_FORMAT");
		assertThat(count("SELECT count(*) FROM student_guardian")).isZero();
	}

	@Test
	void theEleventhGuardianIs422TooMany() {
		String sid = createStudent("ten.guardians");
		for (int i = 1; i <= 10; i++) {
			assertThat(addGuardian(sid, "{\"name\":\"G" + i + "\"}").status()).isEqualTo(201);
		}

		Response eleventh = addGuardian(sid, "{\"name\":\"G11\"}");

		assertThat(eleventh.status()).isEqualTo(422);
		assertThat(fieldCodes(eleventh)).containsExactly("guardians:TOO_MANY");
		assertThat(guardians(sid).json().size()).isEqualTo(10);
	}

	@Test
	void anUnknownStudentOrGuardianIs404() {
		String unknown = STUDENTS + "/" + UUID.randomUUID();

		assertThat(tutor.get(unknown + "/guardians").code()).isEqualTo("NOT_FOUND");
		assertThat(tutor.post(unknown + "/guardians", "{\"name\":\"Mai\"}").status()).isEqualTo(404);
		assertThat(patchGuardian(UUID.randomUUID().toString(), "{\"version\":0,\"name\":\"Mai\"}").status()).isEqualTo(404);
		assertThat(tutor.send("DELETE", GUARDIANS + "/" + UUID.randomUUID(), null, true).status()).isEqualTo(404);
		assertThat(tutor.get(unknown + "/learning-profile").status()).isEqualTo(404);
		assertThat(tutor.send("PUT", unknown + "/learning-profile", "{\"version\":null}", true).status()).isEqualTo(404);
	}

	@Test
	void guardiansAndTheProfileWorkForPausedAndArchivedStudents() {
		String sid = createStudent("archived.guarded");
		assertThat(tutor.post(STUDENTS + "/" + sid + "/status", "{\"status\":\"PAUSED\",\"version\":0}").status())
			.isEqualTo(200);
		assertThat(addGuardian(sid, "{\"name\":\"Paused\"}").status()).isEqualTo(201);
		assertThat(tutor.post(STUDENTS + "/" + sid + "/status", "{\"status\":\"ARCHIVED\",\"version\":1}").status())
			.isEqualTo(200);

		Response added = addGuardian(sid, "{\"name\":\"Archived\"}");
		assertThat(added.status()).isEqualTo(201);
		assertThat(patchGuardian(added.json().path("id").asString(), "{\"version\":0,\"notes\":\"n\"}").status())
			.isEqualTo(200);
		assertThat(names(guardians(sid))).containsExactly("Paused", "Archived");
		assertThat(putProfile(sid, "{\"version\":null,\"currentLevel\":\"B1\"}").status()).isEqualTo(200);
		assertThat(profile(sid).json().path("currentLevel").asString()).isEqualTo("B1");
	}

	@Test
	void theGuardianListMakesTheSameNumberOfStatementsWhateverTheNumberOfGuardians() {
		String sid = createStudent("counted");
		addGuardian(sid, "{\"name\":\"One\"}");
		long one = statementsOf(STUDENTS + "/" + sid + "/guardians");
		for (int i = 2; i <= 10; i++) {
			addGuardian(sid, "{\"name\":\"G" + i + "\"}");
		}

		// Account status check (S4-1/S4-5), the student's existence, the guardians.
		assertThat(statementsOf(STUDENTS + "/" + sid + "/guardians")).isEqualTo(one).isLessThanOrEqualTo(3);
	}

	long statementsOf(String url) {
		Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
		statistics.clear();
		assertThat(tutor.get(url).status()).isEqualTo(200);
		return statistics.getPrepareStatementCount();
	}

	// ---- AC2: guardians at create --------------------------------------------------------------------------------

	@Test
	void createWithGuardiansStoresThemInRequestOrderAndTheStudentDtoDoesNotEmbedThem() {
		Response created = tutor.post(STUDENTS, "{\"fullName\":\"With Parents\",\"username\":\"with.parents\","
				+ "\"guardians\":[{\"name\":\"Mother\",\"phone\":\"0901 234 567\"},{\"name\":\"Father\",\"email\":\"f@example.org\"}]}");

		assertThat(created.status()).isEqualTo(201);
		assertThat(created.json().path("student").has("guardians")).isFalse();
		String sid = created.json().path("student").path("id").asString();
		Response list = guardians(sid);
		assertThat(names(list)).containsExactly("Mother", "Father");
		assertThat(list.json().get(1).path("email").asString()).isEqualTo("f@example.org");
		assertThat(tutor.get(STUDENTS + "/" + sid).json().has("guardians")).isFalse();
	}

	@Test
	void anInvalidGuardianAtCreateIs422WithItsIndexAndNothingIsCreated() {
		Response response = tutor.post(STUDENTS, "{\"fullName\":\"Bad Parent\",\"username\":\"bad.parent\","
				+ "\"guardians\":[{\"relationship\":\"Mother\"},{\"name\":\"Father\",\"email\":\"nope\"},null]}");

		assertThat(response.status()).isEqualTo(422);
		assertThat(fieldCodes(response)).containsExactlyInAnyOrder("guardians[0].name:REQUIRED",
				"guardians[1].email:INVALID_FORMAT", "guardians[2].name:REQUIRED");
		String eleven = String.join(",", IntStream.range(0, 11).mapToObj(i -> "{\"name\":\"G\"}").toList());
		assertThat(fieldCodes(tutor.post(STUDENTS, "{\"fullName\":\"Many\",\"username\":\"many.parents\",\"guardians\":["
				+ eleven + "]}"))).containsExactly("guardians:TOO_MANY");
		assertThat(count("SELECT count(*) FROM user_account WHERE role = 'STUDENT'")).isZero();
		assertThat(count("SELECT count(*) FROM student")).isZero();
		assertThat(count("SELECT count(*) FROM student_guardian")).isZero();
	}

	/**
	 * The guardian insert fails after the account and student rows: one transaction, so nothing remains. The 500 is
	 * logged without PostgreSQL's detail, which can carry the row's values (SEC S4-1).
	 */
	@Test
	void aFailedGuardianInsertRollsTheAccountAndStudentBack(CapturedOutput output) {
		jdbc.execute("""
				CREATE FUNCTION app.reject_probe_guardian() RETURNS trigger LANGUAGE plpgsql AS $$
				BEGIN
				    IF NEW.name = 'Rollback Probe' THEN
				        RAISE EXCEPTION 'probe: guardian insert fails' USING DETAIL = 'probe-detail-' || NEW.name;
				    END IF;
				    RETURN NEW;
				END $$""");
		jdbc.execute("CREATE TRIGGER tr_reject_probe_guardian BEFORE INSERT ON app.student_guardian FOR EACH ROW "
				+ "EXECUTE FUNCTION app.reject_probe_guardian()");
		try {
			Response response = tutor.post(STUDENTS, "{\"fullName\":\"Probe\",\"username\":\"guardian.probe\","
					+ "\"guardians\":[{\"name\":\"Fine\"},{\"name\":\"Rollback Probe\"}]}");

			assertThat(response.status()).isEqualTo(500);
			assertThat(count("SELECT count(*) FROM user_account WHERE username_normalized = 'guardian.probe'")).isZero();
			assertThat(count("SELECT count(*) FROM student")).isZero();
			assertThat(count("SELECT count(*) FROM student_guardian")).isZero();
			assertThat(output.getAll()).contains("Unhandled exception", "probe: guardian insert fails")
				.doesNotContain("probe-detail-");
		}
		finally {
			jdbc.execute("DROP TRIGGER tr_reject_probe_guardian ON app.student_guardian");
			jdbc.execute("DROP FUNCTION app.reject_probe_guardian()");
		}
	}

	// ---- AC3: learning profile -----------------------------------------------------------------------------------

	@Test
	void aStudentNeverEditedHasTheEmptyProfileWithVersionNull() {
		String sid = createStudent("fresh.profile");

		Response response = profile(sid);

		assertThat(response.status()).isEqualTo(200);
		JsonNode empty = response.json();
		assertThat(empty.propertyNames()).containsExactlyInAnyOrder("currentLevel", "learningNotes", "strengths",
				"weaknesses", "customFields", "updatedAt", "version");
		assertThat(List.of(empty.path("currentLevel"), empty.path("learningNotes"), empty.path("updatedAt"),
				empty.path("version"))).allSatisfy(node -> assertThat(node.isNull()).isTrue());
		assertThat(List.of(empty.path("strengths"), empty.path("weaknesses"), empty.path("customFields")))
			.allSatisfy(node -> assertThat(node.isArray() && node.isEmpty()).isTrue());
		assertThat(count("SELECT count(*) FROM student_learning_profile")).isZero();
	}

	@Test
	void theFirstPutCreatesTheProfileAndLaterPutsReplaceIt() {
		String sid = createStudent("profiled");
		clock.advance(Duration.ofHours(1));

		Response created = putProfile(sid, "{\"version\":null,\"currentLevel\":\" B1 \",\"learningNotes\":\"Phát âm tốt, "
				+ "cần luyện ngữ pháp\",\"strengths\":[\"Speaking\",\" speaking \",\"Nghe\",\"NGHE\"],"
				+ "\"weaknesses\":[\"Ngữ pháp\"],\"customFields\":[{\"label\":\"Mục tiêu\",\"value\":\"Du lịch\"}]}");

		assertThat(created.status()).as(created.body()).isEqualTo(200);
		JsonNode body = created.json();
		assertThat(body.path("currentLevel").asString()).isEqualTo("B1");
		assertThat(body.path("learningNotes").asString()).isEqualTo("Phát âm tốt, cần luyện ngữ pháp");
		assertThat(body.path("strengths").valueStream().map(JsonNode::asString).toList()).containsExactly("Speaking",
				"Nghe");
		assertThat(body.path("customFields").get(0).path("label").asString()).isEqualTo("Mục tiêu");
		assertThat(Instant.parse(body.path("updatedAt").asString())).isEqualTo(NOW.plus(Duration.ofHours(1)));
		long version = body.path("version").asLong();
		assertThat(profile(sid).body()).isEqualTo(created.body());

		Response replaced = putProfile(sid, "{\"version\":" + version + ",\"currentLevel\":\"B2\"}");
		assertThat(replaced.status()).isEqualTo(200);
		assertThat(replaced.json().path("currentLevel").asString()).isEqualTo("B2");
		assertThat(replaced.json().path("learningNotes").isNull()).as("absent = cleared").isTrue();
		assertThat(replaced.json().path("strengths").isEmpty()).isTrue();
		assertThat(replaced.json().path("customFields").isEmpty()).isTrue();
		assertThat(replaced.json().path("version").asLong()).isEqualTo(version + 1);
		Response same = putProfile(sid, "{\"version\":" + (version + 1) + ",\"currentLevel\":\"B2\"}");
		assertThat(same.json().path("version").asLong()).as("no change keeps the version").isEqualTo(version + 1);

		Response stale = putProfile(sid, "{\"version\":" + version + ",\"currentLevel\":\"C1\"}");
		assertThat(stale.status()).isEqualTo(409);
		assertThat(stale.code()).isEqualTo("STALE_VERSION");
		Response secondFirst = putProfile(sid, "{\"version\":null,\"currentLevel\":\"C1\"}");
		assertThat(secondFirst.status()).as("a later null version is stale too").isEqualTo(409);
		assertThat(secondFirst.code()).isEqualTo("STALE_VERSION");
		assertThat(putProfile(sid, "{\"currentLevel\":\"C1\"}").status()).as("absent version = null").isEqualTo(409);
		assertThat(profile(sid).json().path("currentLevel").asString()).isEqualTo("B2");
		assertThat(count("SELECT count(*) FROM student_learning_profile")).isOne();
	}

	@Test
	void aStaleNumberBeforeTheFirstPutIs409() {
		String sid = createStudent("no.row.yet");

		Response response = putProfile(sid, "{\"version\":0,\"currentLevel\":\"A2\"}");

		assertThat(response.status()).isEqualTo(409);
		assertThat(response.code()).isEqualTo("STALE_VERSION");
		assertThat(count("SELECT count(*) FROM student_learning_profile")).isZero();
	}

	@Test
	void profileLimitsAre422WithFieldCodes() {
		String sid = createStudent("limits");
		String many = String.join(",", IntStream.range(0, 31).mapToObj(i -> "\"t" + i + "\"").toList());
		String fields = String.join(",", IntStream.range(0, 31).mapToObj(i -> "{\"label\":\"L\",\"value\":\"v\"}").toList());

		Response response = putProfile(sid, "{\"version\":null,\"currentLevel\":\"" + "x".repeat(41)
				+ "\",\"learningNotes\":\"" + "n".repeat(2001) + "\",\"strengths\":[" + many + "],\"weaknesses\":[\"a,b\",\""
				+ "w".repeat(41) + "\",\"  \",\"x\\u0000\"],\"customFields\":[" + fields + "]}");

		assertThat(response.status()).isEqualTo(422);
		assertThat(fieldCodes(response)).containsExactlyInAnyOrder("currentLevel:TOO_LONG", "learningNotes:TOO_LONG",
				"strengths:TOO_MANY", "weaknesses[0]:INVALID_FORMAT", "weaknesses[1]:TOO_LONG", "weaknesses[2]:REQUIRED",
				"weaknesses[3]:INVALID_FORMAT", "customFields:TOO_MANY");
		assertThat(fieldCodes(putProfile(sid, "{\"version\":null,\"customFields\":[{\"value\":\"v\"},{\"label\":\""
				+ "l".repeat(61) + "\",\"value\":\"" + "v".repeat(501) + "\"}],\"learningNotes\":\"a\\u0000\"}")))
			.containsExactlyInAnyOrder("customFields[0].label:REQUIRED", "customFields[1].label:TOO_LONG",
					"customFields[1].value:TOO_LONG", "learningNotes:INVALID_FORMAT");
		assertThat(fieldCodes(putProfile(sid, "{\"version\":-1}"))).containsExactly("version:INVALID_VALUE");
		String thirtyWithDuplicates = String.join(",", IntStream.range(0, 30).mapToObj(i -> "\"t" + i + "\",\"T" + i + "\"").toList());
		Response deduplicated = putProfile(sid, "{\"version\":null,\"strengths\":[" + thirtyWithDuplicates + "]}");
		assertThat(deduplicated.status()).as("30 after case-insensitive deduplication").isEqualTo(200);
		assertThat(deduplicated.json().path("strengths").size()).isEqualTo(30);
	}

	/** T-M2.9 QA F1: tab, LF, CR, DEL and C1 characters in a tag are 422 INVALID_FORMAT naming the tag. */
	@Test
	void controlCharactersInATagAre422() {
		String sid = createStudent("tag.controls");

		Response response = putProfile(sid, "{\"version\":null,\"strengths\":[\"a\\tb\",\"c\\n\",\"\\rd\"],"
				+ "\"weaknesses\":[\"e\\u007f\",\"f\\u0085\"]}");

		assertThat(response.status()).isEqualTo(422);
		assertThat(fieldCodes(response)).containsExactlyInAnyOrder("strengths[0]:INVALID_FORMAT",
				"strengths[1]:INVALID_FORMAT", "strengths[2]:INVALID_FORMAT", "weaknesses[0]:INVALID_FORMAT",
				"weaknesses[1]:INVALID_FORMAT");
		assertThat(count("SELECT count(*) FROM student_learning_profile")).isZero();
	}

	/** T-M2.9 QA F2: write timestamps are stored at microsecond precision, so a write response equals the next read. */
	@Test
	void aWriteResponseCarriesTheSameUpdatedAtAsTheNextRead() {
		String sid = createStudent("precise");
		clock.set(NOW.plusNanos(123_456_789));

		Response put = putProfile(sid, "{\"version\":null,\"currentLevel\":\"B1\"}");
		Response patched = tutor.send("PATCH", STUDENTS + "/" + sid, "{\"version\":0,\"note\":\"n\"}", true);

		assertThat(put.json().path("updatedAt").asString()).isEqualTo("2026-10-09T03:00:00.123456Z")
			.isEqualTo(profile(sid).json().path("updatedAt").asString());
		assertThat(patched.json().path("updatedAt").asString())
			.isEqualTo(tutor.get(STUDENTS + "/" + sid).json().path("updatedAt").asString());
		assertThat(put.body()).isEqualTo(profile(sid).body());
	}

	// ---- AC9: logs -------------------------------------------------------------------------------------------------

	@Test
	void noGuardianOrProfileValueAppearsInTheLog(CapturedOutput output) {
		String sid = createStudent("logged");
		String gid = addGuardian(sid, "{\"name\":\"LOGCHECK-GNAME\",\"relationship\":\"LOGCHECK-GREL\","
				+ "\"email\":\"logcheck-mail@example.org\",\"phone\":\"0909 111 222\",\"notes\":\"LOGCHECK-GNOTES\"}")
			.json()
			.path("id")
			.asString();
		patchGuardian(gid, "{\"version\":0,\"notes\":\"LOGCHECK-GNOTES2\"}");
		addGuardian(sid, "{\"name\":\"LOGCHECK-NUL\\u0000\"}");
		putProfile(sid, "{\"version\":null,\"currentLevel\":\"LOGCHECK-LEVEL\",\"learningNotes\":\"LOGCHECK-NOTES\","
				+ "\"strengths\":[\"LOGCHECK-STRENGTH\"],\"weaknesses\":[\"LOGCHECK-WEAKNESS\"],"
				+ "\"customFields\":[{\"label\":\"LOGCHECK-LABEL\",\"value\":\"LOGCHECK-VALUE\"}]}");
		putProfile(sid, "{\"version\":null,\"currentLevel\":\"LOGCHECK-STALE\"}");
		putProfile(sid, "{\"version\":null,\"learningNotes\":\"LOGCHECK-NUL2\\u0000\"}");
		profile(sid);
		guardians(sid);

		assertThat(output.getAll().toLowerCase()).doesNotContain("logcheck", "0909 111 222");
	}

}
