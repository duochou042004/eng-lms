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
 * T-M2.3 AC1–AC7 over HTTP on the real port, with a controllable clock (AC6 expiry) and Hibernate statistics (AC3
 * statement count). {@link StudentCreateRaceTest} shares this context.
 */
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=100000",
				"spring.jpa.properties.hibernate.generate_statistics=true" })
@Import({ TestcontainersConfiguration.class, MutableClockConfiguration.class })
@ExtendWith(OutputCaptureExtension.class)
class StudentsApiIntegrationTest {

	static final Instant NOW = Instant.parse("2026-10-07T03:00:00Z");

	static final String STUDENTS = "/api/v1/tutor/students";

	@LocalServerPort
	int port;

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	MutableClock clock;

	@Autowired
	EntityManagerFactory entityManagerFactory;

	UUID tutorId;

	Browser tutor;

	@BeforeEach
	void setUp() {
		clock.set(NOW);
		IdentityFixtures.reset(jdbc);
		tutorId = IdentityFixtures.insert(jdbc, "tutor.one", PASSWORD, Role.TUTOR, false);
		tutor = signedIn("tutor.one", PASSWORD, false);
	}

	Browser signedIn(String username, String password, boolean rememberMe) {
		Browser browser = new Browser(port);
		assertThat(browser.login(username, password, rememberMe).status()).as("sign-in of %s", username).isEqualTo(200);
		return browser;
	}

	Response create(String json) {
		return tutor.post(STUDENTS, json);
	}

	JsonNode createStudent(String fullName, String username) {
		Response response = create("{\"fullName\":" + quote(fullName) + ",\"username\":" + quote(username) + "}");
		assertThat(response.status()).as(response.body()).isEqualTo(201);
		return response.json();
	}

	String sid(JsonNode created) {
		return created.path("student").path("id").asString();
	}

	Response patch(String sid, String json) {
		return tutor.send("PATCH", STUDENTS + "/" + sid, json, true);
	}

	Response status(String sid, String status, long version) {
		return tutor.post(STUDENTS + "/" + sid + "/status", "{\"status\":\"" + status + "\",\"version\":" + version + "}");
	}

	long version(String sid) {
		return tutor.get(STUDENTS + "/" + sid).json().path("version").asLong();
	}

	int count(String sql, Object... args) {
		return jdbc.queryForObject(sql, Integer.class, args);
	}

	List<String> fieldCodes(Response response) {
		List<String> codes = new ArrayList<>();
		response.json().path("errors").forEach(e -> codes.add(e.path("field").asString() + ":" + e.path("code").asString()));
		return codes;
	}

	List<String> names(Response list) {
		List<String> names = new ArrayList<>();
		list.json().path("items").forEach(item -> names.add(item.path("fullName").asString()));
		return names;
	}

	// ---- AC1 -------------------------------------------------------------------------------------------------

	@Test
	void createMakesTheStudentAccountAndTheStudentAndReturnsGeneratedCredentialsOnce() {
		Response response = create("{\"fullName\":\"  Nguyễn Văn An \",\"username\":\"nguyenvanan\","
				+ "\"email\":\"an@example.org\",\"phone\":\"0901 234 567\","
				+ "\"contactHandles\":[{\"label\":\"Zalo\",\"value\":\"0901234567\"}],\"note\":\"Evening lessons\"}");

		assertThat(response.status()).isEqualTo(201);
		JsonNode student = response.json().path("student");
		JsonNode credentials = response.json().path("credentials");
		assertThat(response.header("Location")).isEqualTo(STUDENTS + "/" + student.path("id").asString());
		assertThat(response.header("Cache-Control")).isEqualTo("no-store");
		assertThat(student.path("fullName").asString()).isEqualTo("Nguyễn Văn An");
		assertThat(student.path("username").asString()).isEqualTo("nguyenvanan");
		assertThat(student.path("status").asString()).isEqualTo("ACTIVE");
		assertThat(student.path("contactHandles").get(0).path("label").asString()).isEqualTo("Zalo");
		assertThat(student.path("version").asLong()).isZero();
		String temporary = credentials.path("temporaryPassword").asString();
		assertThat(temporary).hasSizeGreaterThanOrEqualTo(12);
		assertThat(credentials.path("username").asString()).isEqualTo("nguyenvanan");
		assertThat(Instant.parse(credentials.path("expiresAt").asString())).isEqualTo(NOW.plus(Duration.ofDays(7)));

		UUID userId = jdbc.queryForObject("SELECT user_id FROM student WHERE id = ?", UUID.class,
				UUID.fromString(student.path("id").asString()));
		assertThat(jdbc.queryForMap("SELECT role, status, must_change_password, temp_password_expires_at "
				+ "FROM user_account WHERE id = ?", userId)).containsEntry("role", "STUDENT")
			.containsEntry("status", "ACTIVE")
			.containsEntry("must_change_password", true);
		assertThat(jdbc.queryForObject("SELECT temp_password_expires_at FROM user_account WHERE id = ?",
				java.sql.Timestamp.class, userId).toInstant()).isEqualTo(NOW.plus(Duration.ofDays(7)));
		assertThat(count("SELECT count(*) FROM audit_event WHERE action = 'STUDENT_CREATED' AND actor_user_id = ? "
				+ "AND subject_id = ?", tutorId, UUID.fromString(student.path("id").asString()))).isOne();

		// The generated password signs in, and then a change is required.
		Browser browser = new Browser(port);
		Response login = browser.login("nguyenvanan", temporary, false);
		assertThat(login.status()).isEqualTo(200);
		assertThat(login.json().path("mustChangePassword").asBoolean()).isTrue();
		assertThat(browser.get("/api/v1/student/home").code()).isEqualTo("PASSWORD_CHANGE_REQUIRED");
		assertThat(browser.post("/api/v1/auth/password", "{\"currentPassword\":" + quote(temporary)
				+ ",\"newPassword\":\"a-fresh-student-secret\"}").status()).isEqualTo(204);
		assertThat(new Browser(port).login("nguyenvanan", temporary, false).status()).isEqualTo(401);
	}

	@Test
	void aSuppliedPasswordMustPassThePolicyAndIsUsedWhenItDoes() {
		Response weak = create("{\"fullName\":\"Weak Pw\",\"username\":\"weak.pw\",\"password\":\"qz7-x9\"}");
		assertThat(weak.status()).isEqualTo(422);
		assertThat(weak.code()).isEqualTo("VALIDATION_FAILED");
		assertThat(fieldCodes(weak)).containsExactly("password:PASSWORD_TOO_SHORT");
		assertThat(fieldCodes(create("{\"fullName\":\"Same Pw\",\"username\":\"same.password\","
				+ "\"password\":\"Same.Password\"}"))).contains("password:PASSWORD_EQUALS_USERNAME");
		assertThat(count("SELECT count(*) FROM user_account WHERE role = 'STUDENT'")).isZero();

		Response ok = create("{\"fullName\":\"Own Pw\",\"username\":\"own.pw\",\"password\":\"chosen-by-the-tutor\"}");
		assertThat(ok.status()).isEqualTo(201);
		assertThat(ok.json().path("credentials").path("temporaryPassword").asString()).isEqualTo("chosen-by-the-tutor");
		Response login = new Browser(port).login("own.pw", "chosen-by-the-tutor", false);
		assertThat(login.status()).isEqualTo(200);
		assertThat(login.json().path("mustChangePassword").asBoolean()).isTrue();
	}

	@Test
	void invalidFieldsAre422WithFieldCodesAndNothingIsCreated() {
		String handles = String.join(",", IntStream.range(0, 31).mapToObj(i -> "{\"label\":\"L\",\"value\":\"v\"}").toList());
		Response response = create("{\"fullName\":\"   \",\"username\":\"\",\"email\":\"not-an-email\",\"phone\":\"12ab\","
				+ "\"note\":\"" + "n".repeat(2001) + "\",\"contactHandles\":[" + handles + "]}");

		assertThat(response.status()).isEqualTo(422);
		assertThat(fieldCodes(response)).containsExactlyInAnyOrder("fullName:REQUIRED", "username:REQUIRED",
				"email:INVALID_FORMAT", "phone:INVALID_FORMAT", "note:TOO_LONG", "contactHandles:TOO_MANY");

		Response more = create("{\"fullName\":\"" + "x".repeat(121) + "\",\"username\":\"ok.name\","
				+ "\"contactHandles\":[{\"label\":\" \",\"value\":\"v\"},{\"label\":\"" + "l".repeat(61) + "\",\"value\":\""
				+ "v".repeat(501) + "\"}]}");
		assertThat(fieldCodes(more)).containsExactlyInAnyOrder("fullName:TOO_LONG", "contactHandles[0].label:REQUIRED",
				"contactHandles[1].label:TOO_LONG", "contactHandles[1].value:TOO_LONG");
		assertThat(count("SELECT count(*) FROM student")).isZero();
		assertThat(count("SELECT count(*) FROM user_account WHERE role = 'STUDENT'")).isZero();
	}

	@Test
	void aFailedStudentInsertRollsTheAccountBackAndLeavesNoAuditRow() {
		jdbc.execute("""
				CREATE FUNCTION app.reject_probe_student() RETURNS trigger LANGUAGE plpgsql AS $$
				BEGIN
				    IF NEW.full_name = 'Rollback Probe' THEN RAISE EXCEPTION 'probe: student insert fails'; END IF;
				    RETURN NEW;
				END $$""");
		jdbc.execute("CREATE TRIGGER tr_reject_probe BEFORE INSERT ON app.student FOR EACH ROW "
				+ "EXECUTE FUNCTION app.reject_probe_student()");
		try {
			Response response = create("{\"fullName\":\"Rollback Probe\",\"username\":\"rollback.probe\"}");

			assertThat(response.status()).isEqualTo(500);
			assertThat(count("SELECT count(*) FROM user_account WHERE username_normalized = 'rollback.probe'")).isZero();
			assertThat(count("SELECT count(*) FROM student")).isZero();
			assertThat(count("SELECT count(*) FROM audit_event WHERE action = 'STUDENT_CREATED'")).isZero();
		}
		finally {
			jdbc.execute("DROP TRIGGER tr_reject_probe ON app.student");
			jdbc.execute("DROP FUNCTION app.reject_probe_student()");
		}
		assertThat(create("{\"fullName\":\"Rollback Probe\",\"username\":\"rollback.probe\"}").status()).isEqualTo(201);
	}

	/** T-M2.3 G3 QA-S3-1 / SEC-S3-1: a NUL or other C0 control character is a 422, never a 500 or a logged value. */
	@Test
	void controlCharactersInFreeTextAre422NamingTheField(CapturedOutput output) {
		Response response = create("{\"fullName\":\"An\\u0000\",\"username\":\"nul.probe\",\"email\":\"a\\u0000@b.org\","
				+ "\"phone\":\"0901\\u0000234\",\"note\":\"x\\u001by\",\"contactHandles\":[{\"label\":\"Za\\u0000lo\","
				+ "\"value\":\"SECRET-NUL-VALUE\\u0000\"}]}");

		assertThat(response.status()).isEqualTo(422);
		assertThat(fieldCodes(response)).containsExactlyInAnyOrder("fullName:INVALID_FORMAT", "email:INVALID_FORMAT",
				"phone:INVALID_FORMAT", "note:INVALID_FORMAT", "contactHandles[0].label:INVALID_FORMAT",
				"contactHandles[0].value:INVALID_FORMAT");
		String sid = sid(createStudent("Tab Ok", "tab.ok"));
		assertThat(patch(sid, "{\"version\":0,\"note\":\"line one\\nline\\ttwo\\r\"}").status()).as("tab, LF, CR allowed")
			.isEqualTo(200);
		assertThat(fieldCodes(patch(sid, "{\"version\":1,\"contactHandles\":[{\"label\":\"L\",\"value\":\"v\\u0000\"}]}")))
			.containsExactly("contactHandles[0].value:INVALID_FORMAT");
		Response search = tutor.get(STUDENTS + "?q=nul%00probe");
		assertThat(search.status()).isEqualTo(422);
		assertThat(fieldCodes(search)).containsExactly("q:INVALID_FORMAT");
		assertThat(output.getAll()).doesNotContain("SECRET-NUL-VALUE").doesNotContain("Unhandled exception");
	}

	/** T-M2.3 G3 QA-S3-2 / SEC-S4-4: only a change of the row moves updatedAt and version (clock moving). */
	@Test
	void aUsernameOnlyOrNoOpPatchKeepsVersionAndUpdatedAt() {
		String sid = sid(create("{\"fullName\":\"Stable Row\",\"username\":\"stable.row\",\"note\":\"n\","
				+ "\"contactHandles\":[{\"label\":\"Zalo\",\"value\":\"0909\"}]}").json());
		String created = tutor.get(STUDENTS + "/" + sid).json().path("updatedAt").asString();

		clock.advance(Duration.ofHours(1));
		Response renamed = patch(sid, "{\"version\":0,\"username\":\"stable.renamed\"}");
		clock.advance(Duration.ofHours(1));
		Response same = patch(sid, "{\"version\":0,\"fullName\":\" Stable Row \",\"note\":\"n\","
				+ "\"contactHandles\":[{\"label\":\"Zalo\",\"value\":\"0909\"}]}");

		assertThat(List.of(renamed, same)).allSatisfy(response -> {
			assertThat(response.status()).isEqualTo(200);
			assertThat(response.json().path("version").asLong()).isZero();
			assertThat(response.json().path("updatedAt").asString()).isEqualTo(created);
		});
		assertThat(renamed.json().path("username").asString()).isEqualTo("stable.renamed");
		Response changed = patch(sid, "{\"version\":0,\"note\":\"m\"}");
		assertThat(changed.json().path("version").asLong()).isEqualTo(1);
		assertThat(Instant.parse(changed.json().path("updatedAt").asString())).isEqualTo(NOW.plus(Duration.ofHours(2)));
	}

	@Test
	void aNegativeVersionIsInvalidNotMissing() {
		String sid = sid(createStudent("Negative Version", "negative.version"));

		assertThat(fieldCodes(patch(sid, "{\"version\":-1,\"note\":\"x\"}"))).containsExactly("version:INVALID_VALUE");
		assertThat(fieldCodes(status(sid, "PAUSED", -1))).containsExactly("version:INVALID_VALUE");
	}

	// ---- AC2 -------------------------------------------------------------------------------------------------

	@Test
	void aUsernameEqualAfterNormalisationIs409UsernameTaken() {
		createStudent("An Nguyen", "an.nguyen");

		for (String duplicate : List.of("AN.Nguyen", "  an.nguyen  ")) {
			Response response = create("{\"fullName\":\"Other\",\"username\":" + quote(duplicate) + "}");
			assertThat(response.status()).isEqualTo(409);
			assertThat(response.code()).isEqualTo("USERNAME_TAKEN");
			assertThat(response.json().path("errors").get(0).path("field").asString()).isEqualTo("username");
		}
		// The tutor's own username is taken too.
		assertThat(create("{\"fullName\":\"Other\",\"username\":\"Tutor.One\"}").code()).isEqualTo("USERNAME_TAKEN");
		assertThat(count("SELECT count(*) FROM student")).isOne();
	}

	@Test
	void anAccentedUsernameIsInvalid() {
		Response response = create("{\"fullName\":\"Accent\",\"username\":\"ngùyen\"}");

		assertThat(response.status()).isEqualTo(422);
		assertThat(fieldCodes(response)).containsExactly("username:USERNAME_INVALID");
		JsonNode availability = tutor.get("/api/v1/tutor/usernames/availability?username=ng%C3%B9yen").json();
		assertThat(availability.path("available").asBoolean()).isFalse();
		assertThat(availability.path("reason").asString()).isEqualTo("INVALID");
	}

	@Test
	void theSuggestionIsTheNormalisedNameThenTheFirstFreeSuffix() {
		String url = "/api/v1/tutor/usernames/suggestion?fullName=Nguy%E1%BB%85n%20V%C4%83n%20An";
		assertThat(tutor.get(url).json().path("username").asString()).isEqualTo("nguyenvanan");

		createStudent("Nguyễn Văn An", "nguyenvanan");
		assertThat(tutor.get(url).json().path("username").asString()).isEqualTo("nguyenvanan2");
		createStudent("Nguyễn Văn An", "NguyenVanAn2");
		assertThat(tutor.get(url).json().path("username").asString()).isEqualTo("nguyenvanan3");
		assertThat(tutor.get("/api/v1/tutor/usernames/suggestion").json().path("username").asString()).isEqualTo("student");
	}

	@Test
	void availabilityAnswersAvailableInvalidOrTaken() {
		createStudent("Taken Name", "taken.name");

		JsonNode free = tutor.get("/api/v1/tutor/usernames/availability?username=free.name").json();
		assertThat(free.path("available").asBoolean()).isTrue();
		assertThat(free.path("reason").isNull()).isTrue();
		JsonNode taken = tutor.get("/api/v1/tutor/usernames/availability?username=TAKEN.name").json();
		assertThat(taken.path("available").asBoolean()).isFalse();
		assertThat(taken.path("reason").asString()).isEqualTo("TAKEN");
		assertThat(tutor.get("/api/v1/tutor/usernames/availability?username=ab").json().path("reason").asString())
			.isEqualTo("INVALID");
	}

	// ---- AC3 -------------------------------------------------------------------------------------------------

	@Test
	void theListShowsActiveAndPausedByDefaultAndArchivedOnlyWhenAsked() {
		createStudent("Alpha Active", "alpha");
		String paused = sid(createStudent("Bravo Paused", "bravo"));
		String archived = sid(createStudent("Charlie Archived", "charlie"));
		assertThat(status(paused, "PAUSED", 0).status()).isEqualTo(200);
		assertThat(status(archived, "ARCHIVED", 0).status()).isEqualTo(200);

		Response list = tutor.get(STUDENTS);
		assertThat(names(list)).containsExactly("Alpha Active", "Bravo Paused");
		assertThat(list.json().path("totalItems").asLong()).isEqualTo(2);
		assertThat(list.json().path("items").get(0).propertyNames()).containsExactlyInAnyOrder("id", "fullName",
				"username", "status", "email", "phone", "createdAt");
		assertThat(names(tutor.get(STUDENTS + "?status=ARCHIVED"))).containsExactly("Charlie Archived");
		assertThat(names(tutor.get(STUDENTS + "?status=ACTIVE&status=ARCHIVED"))).containsExactly("Alpha Active",
				"Charlie Archived");
	}

	@Test
	void searchIsAccentAndCaseInsensitiveOverNameUsernameEmailPhoneAndHandleValues() {
		createStudent("Nguyễn Thị Mai", "mai.t");
		createStudent("Đặng Văn Bình", "binh.d");
		create("{\"fullName\":\"Email Person\",\"username\":\"person.one\",\"email\":\"Hello.World@Example.org\"}");
		create("{\"fullName\":\"Phone Person\",\"username\":\"person.two\",\"phone\":\"+84 912 000 111\"}");
		create("{\"fullName\":\"Handle Person\",\"username\":\"person.three\","
				+ "\"contactHandles\":[{\"label\":\"Facebook\",\"value\":\"fb.com/Thao.Nguyen\"}]}");
		createStudent("Username Match", "xyzzy.user");

		assertThat(names(tutor.get(STUDENTS + "?q=nguyen"))).containsExactlyInAnyOrder("Nguyễn Thị Mai", "Handle Person");
		assertThat(names(tutor.get(STUDENTS + "?q=NGUY%E1%BB%84N"))).containsExactlyInAnyOrder("Nguyễn Thị Mai",
				"Handle Person");
		assertThat(names(tutor.get(STUDENTS + "?q=dang"))).containsExactly("Đặng Văn Bình");
		assertThat(names(tutor.get(STUDENTS + "?q=hello.world"))).containsExactly("Email Person");
		assertThat(names(tutor.get(STUDENTS + "?q=912%20000"))).containsExactly("Phone Person");
		assertThat(names(tutor.get(STUDENTS + "?q=XYZZY"))).containsExactly("Username Match");
		assertThat(names(tutor.get(STUDENTS + "?q=nobody-matches"))).isEmpty();
	}

	@Test
	void likeWildcardsInQMatchLiterally() {
		createStudent("Plain Name", "plain");
		createStudent("Hundred 100% Ready", "percent");
		createStudent("Under_Score", "under.score");

		assertThat(names(tutor.get(STUDENTS + "?q=%25"))).containsExactly("Hundred 100% Ready");
		assertThat(names(tutor.get(STUDENTS + "?q=_"))).containsExactly("Under_Score");
		assertThat(names(tutor.get(STUDENTS + "?q=%5C"))).isEmpty();
	}

	@Test
	void pagingAndTheFullNameAndCreatedAtSortsFollowTheConventions() {
		createStudent("Carol", "carol");
		clock.advance(Duration.ofMinutes(1));
		createStudent("Alice", "alice");
		clock.advance(Duration.ofMinutes(1));
		createStudent("Bob", "bob");

		Response first = tutor.get(STUDENTS + "?size=2");
		assertThat(names(first)).containsExactly("Alice", "Bob");
		assertThat(first.json().path("page").asInt()).isZero();
		assertThat(first.json().path("size").asInt()).isEqualTo(2);
		assertThat(first.json().path("totalItems").asLong()).isEqualTo(3);
		assertThat(first.json().path("totalPages").asInt()).isEqualTo(2);
		assertThat(names(tutor.get(STUDENTS + "?size=2&page=1"))).containsExactly("Carol");
		assertThat(names(tutor.get(STUDENTS + "?sort=fullName,desc"))).containsExactly("Carol", "Bob", "Alice");
		assertThat(names(tutor.get(STUDENTS + "?sort=createdAt"))).containsExactly("Carol", "Alice", "Bob");
		assertThat(names(tutor.get(STUDENTS + "?sort=createdAt,desc"))).containsExactly("Bob", "Alice", "Carol");
	}

	@Test
	void anUnknownSortOrStatusOrAnOutOfRangePageIs422NamingTheField() {
		for (String query : List.of("sort=nextLesson", "sort=fullName,up", "sort=email", "status=DELETED",
				"status=active", "size=101", "size=0", "page=-1", "page=2147483647&size=100", "page=85899346", "q=a%00b",
				"q=%07")) {
			Response response = tutor.get(STUDENTS + "?" + query);
			assertThat(response.status()).as(query).isEqualTo(422);
			assertThat(response.code()).isEqualTo("VALIDATION_FAILED");
			assertThat(response.json().path("errors").get(0).path("field").asString()).as(query)
				.isEqualTo(query.substring(0, query.indexOf('=')));
		}
	}

	@Test
	void theListMakesTheSameNumberOfStatementsWhateverTheNumberOfRows() {
		createStudent("Row One", "row.one");
		createStudent("Row Two", "row.two");
		long few = statementsOf(STUDENTS + "?q=row");
		long fewUnfiltered = statementsOf(STUDENTS);
		for (int i = 3; i <= 12; i++) {
			jdbc.update("INSERT INTO student (id, user_id, full_name, search_text, status, created_at, updated_at) "
					+ "VALUES (?, ?, ?, ?, 'ACTIVE', now(), now())", UUID.randomUUID(),
					IdentityFixtures.insert(jdbc, "row.n" + i, PASSWORD, Role.STUDENT, false), "Row N" + i, "row n" + i);
		}

		Response list = tutor.get(STUDENTS + "?q=row");
		assertThat(list.json().path("totalItems").asLong()).isEqualTo(12);
		assertThat(list.json().path("items").get(11).path("username").asString()).startsWith("row.");
		// Account status check (S4-1), username lookup for q, the page, the page's usernames in one batch.
		assertThat(statementsOf(STUDENTS + "?q=row")).isEqualTo(few).isLessThanOrEqualTo(4);
		assertThat(statementsOf(STUDENTS)).isEqualTo(fewUnfiltered).isLessThanOrEqualTo(3);
	}

	long statementsOf(String url) {
		Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
		statistics.clear();
		assertThat(tutor.get(url).status()).isEqualTo(200);
		return statistics.getPrepareStatementCount();
	}

	// ---- AC4 -------------------------------------------------------------------------------------------------

	@Test
	void getAndPatchReadAndUpdateTheProfileWithOptimisticLocking() {
		String sid = sid(createStudent("Profile Person", "profile.person"));
		Response read = tutor.get(STUDENTS + "/" + sid);
		assertThat(read.status()).isEqualTo(200);
		assertThat(read.json().propertyNames()).containsExactlyInAnyOrder("id", "fullName", "username", "status", "email",
				"phone", "contactHandles", "note", "createdAt", "updatedAt", "version");

		Response updated = patch(sid, "{\"version\":0,\"fullName\":\"Profile Renamed\",\"email\":\"p@example.org\","
				+ "\"contactHandles\":[{\"label\":\"Zalo\",\"value\":\"0909\"}],\"note\":\"Likes songs\"}");
		assertThat(updated.status()).isEqualTo(200);
		assertThat(updated.json().path("fullName").asString()).isEqualTo("Profile Renamed");
		assertThat(updated.json().path("version").asLong()).isEqualTo(1);
		assertThat(updated.json().path("contactHandles").get(0).path("value").asString()).isEqualTo("0909");

		// Absent fields stay, null clears.
		Response cleared = patch(sid, "{\"version\":1,\"email\":null}");
		assertThat(cleared.json().path("email").isNull()).isTrue();
		assertThat(cleared.json().path("note").asString()).isEqualTo("Likes songs");
		assertThat(cleared.json().path("fullName").asString()).isEqualTo("Profile Renamed");
		assertThat(names(tutor.get(STUDENTS + "?q=renamed"))).containsExactly("Profile Renamed");

		Response stale = patch(sid, "{\"version\":1,\"note\":\"late\"}");
		assertThat(stale.status()).isEqualTo(409);
		assertThat(stale.code()).isEqualTo("STALE_VERSION");
		assertThat(fieldCodes(patch(sid, "{\"note\":\"no version\"}"))).containsExactly("version:REQUIRED");
		assertThat(fieldCodes(patch(sid, "{\"version\":2,\"fullName\":null,\"phone\":\"x\",\"username\":\"bad name\"}")))
			.containsExactlyInAnyOrder("fullName:REQUIRED", "phone:INVALID_FORMAT", "username:USERNAME_INVALID");
	}

	@Test
	void aUsernameChangeAppliesUniquenessKeepsTheStudentsSessionsAndIsAudited() {
		JsonNode created = createStudent("Rename Me", "rename.me");
		String sid = sid(created);
		createStudent("Other One", "other.one");
		Browser student = signedIn("rename.me", created.path("credentials").path("temporaryPassword").asString(), false);

		Response taken = patch(sid, "{\"version\":0,\"username\":\"OTHER.one\"}");
		assertThat(taken.status()).isEqualTo(409);
		assertThat(taken.code()).isEqualTo("USERNAME_TAKEN");
		assertThat(taken.json().path("errors").get(0).path("field").asString()).isEqualTo("username");

		Response renamed = patch(sid, "{\"version\":0,\"username\":\"renamed.student\"}");
		assertThat(renamed.status()).isEqualTo(200);
		assertThat(renamed.json().path("username").asString()).isEqualTo("renamed.student");
		Response session = student.get("/api/v1/auth/session");
		assertThat(session.status()).isEqualTo(200);
		assertThat(session.json().path("username").asString()).isEqualTo("renamed.student");
		assertThat(count("SELECT count(*) FROM audit_event WHERE action = 'USERNAME_CHANGED' AND subject_id = ? "
				+ "AND actor_user_id = ?", UUID.fromString(sid), tutorId)).isOne();
		// The username lives on the account: the student row and its version are unchanged.
		assertThat(renamed.json().path("version").asLong()).isZero();
		// Same username again: no change, no event.
		assertThat(patch(sid, "{\"version\":0,\"username\":\"renamed.student\"}").status()).isEqualTo(200);
		assertThat(count("SELECT count(*) FROM audit_event WHERE action = 'USERNAME_CHANGED'")).isOne();
	}

	@Test
	void anUnknownStudentIs404Everywhere() {
		String unknown = STUDENTS + "/" + UUID.randomUUID();

		assertThat(tutor.get(unknown).code()).isEqualTo("NOT_FOUND");
		assertThat(tutor.send("PATCH", unknown, "{\"version\":0}", true).status()).isEqualTo(404);
		assertThat(tutor.post(unknown + "/status", "{\"status\":\"PAUSED\",\"version\":0}").status()).isEqualTo(404);
		assertThat(tutor.post(unknown + "/password-reset", null).status()).isEqualTo(404);
	}

	// ---- AC5 -------------------------------------------------------------------------------------------------

	@Test
	void statusTransitionsFollowTheLifecycleAndAreAudited() {
		JsonNode created = createStudent("Life Cycle", "life.cycle");
		String sid = sid(created);
		String password = created.path("credentials").path("temporaryPassword").asString();

		Response paused = status(sid, "PAUSED", 0);
		assertThat(paused.status()).isEqualTo(200);
		assertThat(paused.json().path("status").asString()).isEqualTo("PAUSED");
		assertThat(paused.json().path("version").asLong()).isEqualTo(1);
		assertThat(new Browser(port).login("life.cycle", password, false).status()).as("PAUSED keeps sign-in").isEqualTo(200);
		assertThat(status(sid, "PAUSED", 1).code()).isEqualTo("INVALID_STATE_TRANSITION");
		assertThat(status(sid, "ACTIVE", 0).code()).isEqualTo("STALE_VERSION");
		assertThat(status(sid, "ACTIVE", 1).status()).isEqualTo(200);
		assertThat(status(sid, "ARCHIVED", 2).status()).isEqualTo(200);
		Response invalid = status(sid, "PAUSED", 3);
		assertThat(invalid.status()).isEqualTo(409);
		assertThat(invalid.code()).isEqualTo("INVALID_STATE_TRANSITION");
		assertThat(status(sid, "ACTIVE", 3).status()).isEqualTo(200);
		assertThat(fieldCodes(tutor.post(STUDENTS + "/" + sid + "/status", "{\"status\":\"GONE\"}")))
			.containsExactlyInAnyOrder("status:INVALID_VALUE", "version:REQUIRED");

		assertThat(jdbc.queryForList("SELECT (details->>'from') || '>' || (details->>'to') FROM audit_event "
				+ "WHERE action = 'STUDENT_STATUS_CHANGED' AND subject_id = ? AND actor_user_id = ? ORDER BY occurred_at, id",
				String.class, UUID.fromString(sid), tutorId))
			.containsExactlyInAnyOrder("ACTIVE>PAUSED", "PAUSED>ACTIVE", "ACTIVE>ARCHIVED", "ARCHIVED>ACTIVE");
	}

	@Test
	void archivingEndsEverySessionAndTokenAtOnceAndReactivationReEnablesSignInWithMustChangeUnchanged() {
		JsonNode created = createStudent("Archive Me", "archive.me");
		String sid = sid(created);
		UUID userId = jdbc.queryForObject("SELECT user_id FROM student WHERE id = ?", UUID.class, UUID.fromString(sid));
		Browser first = signedIn("archive.me", created.path("credentials").path("temporaryPassword").asString(), false);
		first.post("/api/v1/auth/password", "{\"currentPassword\":"
				+ quote(created.path("credentials").path("temporaryPassword").asString())
				+ ",\"newPassword\":\"archive-me-secret\"}");
		Browser phone = signedIn("archive.me", "archive-me-secret", false);
		Browser laptop = signedIn("archive.me", "archive-me-secret", false);
		Browser remembered = signedIn("archive.me", "archive-me-secret", true);
		remembered.cookies.remove(Browser.SESSION);
		assertThat(count("SELECT count(*) FROM persistent_logins WHERE username = ?", userId.toString())).isOne();

		assertThat(status(sid, "ARCHIVED", version(sid)).status()).isEqualTo(200);

		assertThat(List.of(phone, laptop, remembered)).allSatisfy(browser -> {
			Response response = browser.get("/api/v1/auth/session");
			assertThat(response.status()).isEqualTo(401);
		});
		assertThat(count("SELECT count(*) FROM spring_session WHERE principal_name = ?", userId.toString())).isZero();
		assertThat(count("SELECT count(*) FROM persistent_logins WHERE username = ?", userId.toString())).isZero();
		Response login = new Browser(port).login("archive.me", "archive-me-secret", false);
		assertThat(login.status()).isEqualTo(401);
		assertThat(login.bodyWithoutRequestId())
			.isEqualTo(new Browser(port).login("nobody.here", "archive-me-secret", false).bodyWithoutRequestId());

		assertThat(status(sid, "ACTIVE", version(sid)).status()).isEqualTo(200);
		Response back = new Browser(port).login("archive.me", "archive-me-secret", false);
		assertThat(back.status()).isEqualTo(200);
		assertThat(back.json().path("mustChangePassword").asBoolean()).isFalse();
	}

	@Test
	void reactivationKeepsAPendingPasswordChange() {
		JsonNode created = createStudent("Pending Change", "pending.change");
		String sid = sid(created);
		assertThat(status(sid, "ARCHIVED", 0).status()).isEqualTo(200);
		assertThat(status(sid, "ACTIVE", 1).status()).isEqualTo(200);

		Response login = new Browser(port).login("pending.change",
				created.path("credentials").path("temporaryPassword").asString(), false);
		assertThat(login.status()).isEqualTo(200);
		assertThat(login.json().path("mustChangePassword").asBoolean()).isTrue();
	}

	// ---- AC6 -------------------------------------------------------------------------------------------------

	@Test
	void aTutorResetGivesANewTemporaryPasswordOnceEndsSessionsClearsTheLockoutAndIsAudited() {
		JsonNode created = createStudent("Reset Me", "reset.me");
		String sid = sid(created);
		UUID userId = jdbc.queryForObject("SELECT user_id FROM student WHERE id = ?", UUID.class, UUID.fromString(sid));
		String first = created.path("credentials").path("temporaryPassword").asString();
		Browser before = signedIn("reset.me", first, false);
		before.post("/api/v1/auth/password", "{\"currentPassword\":" + quote(first) + ",\"newPassword\":\"old-own-secret\"}");
		Browser session = signedIn("reset.me", "old-own-secret", false);
		Browser remembered = signedIn("reset.me", "old-own-secret", true);
		remembered.cookies.remove(Browser.SESSION);
		jdbc.update("UPDATE user_account SET failed_login_count = 3, locked_until = ? WHERE id = ?",
				java.sql.Timestamp.from(NOW.plus(Duration.ofMinutes(10))), userId);

		Response reset = tutor.post(STUDENTS + "/" + sid + "/password-reset", null);

		assertThat(reset.status()).isEqualTo(200);
		assertThat(reset.json().propertyNames()).containsExactlyInAnyOrder("username", "temporaryPassword", "expiresAt");
		assertThat(reset.json().path("username").asString()).isEqualTo("reset.me");
		assertThat(Instant.parse(reset.json().path("expiresAt").asString())).isEqualTo(NOW.plus(Duration.ofDays(7)));
		String temporary = reset.json().path("temporaryPassword").asString();
		assertThat(temporary).hasSizeGreaterThanOrEqualTo(12);
		assertThat(session.get("/api/v1/auth/session").status()).isEqualTo(401);
		assertThat(remembered.get("/api/v1/auth/session").status()).isEqualTo(401);
		assertThat(count("SELECT count(*) FROM persistent_logins WHERE username = ?", userId.toString())).isZero();
		assertThat(jdbc.queryForMap("SELECT failed_login_count, locked_until FROM user_account WHERE id = ?", userId))
			.containsEntry("failed_login_count", 0)
			.containsEntry("locked_until", null);
		assertThat(new Browser(port).login("reset.me", "old-own-secret", false).status()).isEqualTo(401);
		Response login = new Browser(port).login("reset.me", temporary, false);
		assertThat(login.status()).isEqualTo(200);
		assertThat(login.json().path("mustChangePassword").asBoolean()).isTrue();
		assertThat(count("SELECT count(*) FROM audit_event WHERE action = 'PASSWORD_RESET_BY_TUTOR' AND subject_id = ? "
				+ "AND actor_user_id = ?", userId, tutorId)).isOne();
	}

	@Test
	void theTemporaryPasswordExpiresAfterSevenDaysIfUnused() {
		String sid = sid(createStudent("Expiring", "expiring"));
		String temporary = tutor.post(STUDENTS + "/" + sid + "/password-reset", null)
			.json()
			.path("temporaryPassword")
			.asString();
		clock.advance(Duration.ofDays(7).minusMinutes(1));
		assertThat(new Browser(port).login("expiring", temporary, false).status()).isEqualTo(200);

		String again = tutor.post(STUDENTS + "/" + sid + "/password-reset", null).json().path("temporaryPassword").asString();
		clock.advance(Duration.ofDays(7));
		Response expired = new Browser(port).login("expiring", again, false);
		assertThat(expired.status()).isEqualTo(401);
		assertThat(expired.code()).isEqualTo("UNAUTHENTICATED");
	}

	@Test
	void anArchivedStudentCannotBeReset() {
		String sid = sid(createStudent("Archived Reset", "archived.reset"));
		status(sid, "ARCHIVED", 0);

		Response reset = tutor.post(STUDENTS + "/" + sid + "/password-reset", null);
		assertThat(reset.status()).isEqualTo(409);
		assertThat(reset.code()).isEqualTo("INVALID_STATE_TRANSITION");
	}

	// ---- AC7 -------------------------------------------------------------------------------------------------

	@Test
	void noTemporaryPasswordOrHashAppearsInAnyOtherResponseAuditRowOrLogLine(CapturedOutput output) {
		JsonNode created = createStudent("Secret Keeper", "secret.keeper");
		String sid = sid(created);
		String createdPassword = created.path("credentials").path("temporaryPassword").asString();
		String resetPassword = tutor.post(STUDENTS + "/" + sid + "/password-reset", null)
			.json()
			.path("temporaryPassword")
			.asString();
		List<String> secrets = List.of(createdPassword, resetPassword, "$2a$", "{bcrypt}");

		List<String> others = new ArrayList<>(List.of(tutor.get(STUDENTS).body(), tutor.get(STUDENTS + "/" + sid).body(),
				tutor.get(STUDENTS + "?q=secret").body(), status(sid, "PAUSED", 0).body(),
				patch(sid, "{\"version\":1,\"note\":\"n\"}").body()));
		others.addAll(jdbc.queryForList("SELECT row_to_json(a)::text FROM audit_event a", String.class));
		others.add(output.getAll());

		assertThat(others).allSatisfy(text -> assertThat(text).doesNotContain(secrets));
		assertThat(jdbc.queryForList("SELECT action FROM audit_event", String.class)).contains("STUDENT_CREATED",
				"PASSWORD_RESET_BY_TUTOR", "STUDENT_STATUS_CHANGED");
	}

}
