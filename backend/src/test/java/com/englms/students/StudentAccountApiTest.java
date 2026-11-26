package com.englms.students;

import static com.englms.identity.Browser.quote;
import static com.englms.identity.IdentityFixtures.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.LinkedHashMap;
import java.util.Map;

import org.assertj.core.api.SoftAssertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

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
 * T-M2.7 AC1 (FR-SET-02, ADR-0016): {@code GET /api/v1/student/account} over HTTP. The caller kinds of the packet's
 * Domain rules in one table, two students each reading their own name and username, and the exact body. Same context
 * as {@code StudentsApiIntegrationTest}.
 */
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=100000",
				"spring.jpa.properties.hibernate.generate_statistics=true" })
@Import({ TestcontainersConfiguration.class, MutableClockConfiguration.class })
class StudentAccountApiTest {

	static final String ACCOUNT = "/api/v1/student/account";

	static final String STUDENT_PASSWORD = "a-student-secret-42";

	@LocalServerPort
	int port;

	@Autowired
	JdbcTemplate jdbc;

	Browser tutor;

	@BeforeEach
	void setUp() {
		IdentityFixtures.reset(jdbc);
		IdentityFixtures.insert(jdbc, "tutor.one", PASSWORD, Role.TUTOR, false);
		tutor = signedIn("tutor.one", PASSWORD);
	}

	Browser signedIn(String username, String password) {
		Browser browser = new Browser(port);
		assertThat(browser.login(username, password, false).status()).as("sign-in of %s", username).isEqualTo(200);
		return browser;
	}

	/** A student created by the tutor with a known password; {@code mustChange} false clears the first-sign-in flag. */
	String student(String fullName, String username, boolean mustChange) {
		Response created = tutor.post("/api/v1/tutor/students", "{\"fullName\":" + quote(fullName) + ",\"username\":"
				+ quote(username) + ",\"password\":" + quote(STUDENT_PASSWORD) + "}");
		assertThat(created.status()).as(created.body()).isEqualTo(201);
		if (!mustChange) {
			jdbc.update("UPDATE user_account SET must_change_password = false WHERE username = ?", username);
		}
		return created.json().path("student").path("id").asString();
	}

	void status(String sid, String status) {
		long version = tutor.get("/api/v1/tutor/students/" + sid).json().path("version").asLong();
		Response changed = tutor.post("/api/v1/tutor/students/" + sid + "/status",
				"{\"status\":\"" + status + "\",\"version\":" + version + "}");
		assertThat(changed.status()).as(changed.body()).isEqualTo(200);
	}

	@Test
	void everyCallerKindGetsItsAnswer() {
		student("Active Student", "active.student", false);
		String paused = student("Paused Student", "paused.student", false);
		student("Must Change", "must.change", true);
		String archived = student("Archived Student", "archived.student", false);
		status(paused, "PAUSED");
		Browser archivedSession = signedIn("archived.student", STUDENT_PASSWORD);
		status(archived, "ARCHIVED");

		record Answer(int status, String code) {
		}
		Map<String, Browser> callers = new LinkedHashMap<>();
		callers.put("anonymous", new Browser(port));
		callers.put("tutor", tutor);
		callers.put("active student", signedIn("active.student", STUDENT_PASSWORD));
		callers.put("paused student", signedIn("paused.student", STUDENT_PASSWORD));
		callers.put("must-change student", signedIn("must.change", STUDENT_PASSWORD));
		callers.put("archived student's old session", archivedSession);
		Map<String, Answer> expected = Map.of("anonymous", new Answer(401, "UNAUTHENTICATED"), "tutor",
				new Answer(403, "FORBIDDEN_ROLE"), "active student", new Answer(200, null), "paused student",
				new Answer(200, null), "must-change student", new Answer(403, "PASSWORD_CHANGE_REQUIRED"),
				"archived student's old session", new Answer(401, "SESSION_EXPIRED"));

		SoftAssertions softly = new SoftAssertions();
		callers.forEach((caller, browser) -> {
			Response response = browser.get(ACCOUNT);
			Answer answer = (response.status() == 200) ? new Answer(200, null)
					: new Answer(response.status(), response.code());
			softly.assertThat(answer).as("%s: %s", caller, response.body()).isEqualTo(expected.get(caller));
			softly.assertThat(response.header("Cache-Control")).as("%s Cache-Control", caller).isEqualTo("no-store");
		});
		softly.assertAll();
	}

	@Test
	void eachStudentReadsOnlyTheirOwnNameAndUsernameAndNothingElse() {
		student("  Nguyễn Văn An ", "nguyen.an", false);
		student("Trần Thị Bình", "tran.binh", false);
		Response an = signedIn("nguyen.an", STUDENT_PASSWORD).get(ACCOUNT);
		Response binh = signedIn("tran.binh", STUDENT_PASSWORD).get(ACCOUNT);

		assertThat(an.status()).isEqualTo(200);
		assertThat(an.header("Content-Type")).startsWith("application/json");
		JsonNode anBody = an.json();
		assertThat(anBody.propertyNames()).containsExactlyInAnyOrder("fullName", "username");
		assertThat(anBody.path("fullName").asString()).isEqualTo("Nguyễn Văn An");
		assertThat(anBody.path("username").asString()).isEqualTo("nguyen.an");
		assertThat(binh.json().propertyNames()).containsExactlyInAnyOrder("fullName", "username");
		assertThat(binh.json().path("fullName").asString()).isEqualTo("Trần Thị Bình");
		assertThat(binh.json().path("username").asString()).isEqualTo("tran.binh");
	}

	@Test
	void aRenameByTheTutorIsSeenOnTheNextRead() {
		String sid = student("Old Name", "renamed.student", false);
		Browser student = signedIn("renamed.student", STUDENT_PASSWORD);
		assertThat(student.get(ACCOUNT).json().path("fullName").asString()).isEqualTo("Old Name");

		long version = tutor.get("/api/v1/tutor/students/" + sid).json().path("version").asLong();
		assertThat(tutor.send("PATCH", "/api/v1/tutor/students/" + sid,
				"{\"version\":" + version + ",\"fullName\":\"New Name\"}", true).status()).isEqualTo(200);

		assertThat(student.get(ACCOUNT).json().path("fullName").asString()).isEqualTo("New Name");
	}

}
