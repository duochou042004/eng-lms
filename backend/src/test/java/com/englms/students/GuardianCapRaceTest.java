package com.englms.students;

import static com.englms.identity.IdentityFixtures.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

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

/**
 * T-M2.9 AC1 (DEC-103): two concurrent {@code POST …/guardians} on a student with 9 guardians give one 201 and one 422
 * {@code TOO_MANY}, and the 10 guardians have distinct positions. The student-row lock decides, whatever the order;
 * a start latch, no timing bound (DEC-093). Same context as {@link StudentsApiIntegrationTest}.
 */
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=100000",
				"spring.jpa.properties.hibernate.generate_statistics=true" })
@Import({ TestcontainersConfiguration.class, MutableClockConfiguration.class })
class GuardianCapRaceTest {

	@LocalServerPort
	int port;

	@Autowired
	JdbcTemplate jdbc;

	@BeforeEach
	void setUp() {
		IdentityFixtures.reset(jdbc);
		IdentityFixtures.insert(jdbc, "tutor.one", PASSWORD, Role.TUTOR, false);
	}

	Browser tutor() {
		Browser browser = new Browser(port);
		assertThat(browser.login("tutor.one", PASSWORD, false).status()).isEqualTo(200);
		browser.get("/api/v1/auth/session");
		return browser;
	}

	@Test
	void twoConcurrentAppendsToAStudentWithNineGuardiansGiveOne201AndOne422() throws Exception {
		Browser first = tutor();
		Browser second = tutor();
		String sid = first.post("/api/v1/tutor/students", "{\"fullName\":\"Capped\",\"username\":\"capped\"}")
			.json()
			.path("student")
			.path("id")
			.asString();
		String guardians = "/api/v1/tutor/students/" + sid + "/guardians";
		for (int i = 1; i <= 9; i++) {
			assertThat(first.post(guardians, "{\"name\":\"G" + i + "\"}").status()).isEqualTo(201);
		}
		CountDownLatch start = new CountDownLatch(1);
		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			Future<Response> a = pool.submit(append(start, first, guardians, "Racer A"));
			Future<Response> b = pool.submit(append(start, second, guardians, "Racer B"));
			start.countDown();
			List<Response> responses = List.of(a.get(60, TimeUnit.SECONDS), b.get(60, TimeUnit.SECONDS));

			assertThat(responses).extracting(Response::status).containsExactlyInAnyOrder(201, 422);
			Response refused = responses.stream().filter(r -> r.status() == 422).findFirst().orElseThrow();
			assertThat(refused.json().path("errors").get(0).path("field").asString()).isEqualTo("guardians");
			assertThat(refused.json().path("errors").get(0).path("code").asString()).isEqualTo("TOO_MANY");
		}
		finally {
			pool.shutdownNow();
		}
		assertThat(jdbc.queryForList("SELECT position FROM student_guardian ORDER BY position", Integer.class))
			.containsExactly(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
	}

	static Callable<Response> append(CountDownLatch start, Browser browser, String path, String name) {
		return () -> {
			start.await();
			return browser.post(path, "{\"name\":\"" + name + "\"}");
		};
	}

}
