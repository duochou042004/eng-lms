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
 * T-M2.9 AC3 (DEC-103): two concurrent first {@code PUT}s of a learning profile ({@code version} {@code null}) give one
 * 200 and one 409 {@code STALE_VERSION}; the loser's {@code INSERT … ON CONFLICT DO NOTHING} waits for the winner and
 * inserts nothing, whatever the order. A start latch, no timing bound (DEC-093). Same context as
 * {@link StudentsApiIntegrationTest}.
 */
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=100000",
				"spring.jpa.properties.hibernate.generate_statistics=true" })
@Import({ TestcontainersConfiguration.class, MutableClockConfiguration.class })
class LearningProfileFirstPutRaceTest {

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
	void twoConcurrentFirstPutsGiveOne200AndOne409() throws Exception {
		Browser first = tutor();
		Browser second = tutor();
		String sid = first.post("/api/v1/tutor/students", "{\"fullName\":\"Raced\",\"username\":\"raced.profile\"}")
			.json()
			.path("student")
			.path("id")
			.asString();
		String path = "/api/v1/tutor/students/" + sid + "/learning-profile";
		CountDownLatch start = new CountDownLatch(1);
		ExecutorService pool = Executors.newFixedThreadPool(2);
		List<Response> responses;
		try {
			Future<Response> a = pool.submit(put(start, first, path, "A1"));
			Future<Response> b = pool.submit(put(start, second, path, "C2"));
			start.countDown();
			responses = List.of(a.get(60, TimeUnit.SECONDS), b.get(60, TimeUnit.SECONDS));
		}
		finally {
			pool.shutdownNow();
		}

		assertThat(responses).extracting(Response::status).containsExactlyInAnyOrder(200, 409);
		Response winner = responses.stream().filter(r -> r.status() == 200).findFirst().orElseThrow();
		assertThat(responses.stream().filter(r -> r.status() == 409).findFirst().orElseThrow().code())
			.isEqualTo("STALE_VERSION");
		assertThat(first.get(path).json().path("currentLevel").asString())
			.isEqualTo(winner.json().path("currentLevel").asString());
		assertThat(jdbc.queryForObject("SELECT count(*) FROM student_learning_profile", Integer.class)).isOne();
	}

	static Callable<Response> put(CountDownLatch start, Browser browser, String path, String level) {
		return () -> {
			start.await();
			return browser.send("PUT", path, "{\"version\":null,\"currentLevel\":\"" + level + "\"}", true);
		};
	}

}
