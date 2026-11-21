package com.englms.students;

import static com.englms.identity.Browser.quote;
import static com.englms.identity.IdentityFixtures.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;
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
 * T-M2.16 AC4 (L-04): two username-only PATCHes from the same version, released together by a start latch, give
 * exactly one 200 and one 409 {@code STALE_VERSION} in every interleaving (checkVersion, or the forced increment after
 * the account lock). Outcomes only, no timing bound (L-05); the clock is never advanced. Same context as
 * {@link StudentCreateRaceTest}.
 */
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=100000",
				"spring.jpa.properties.hibernate.generate_statistics=true" })
@Import({ TestcontainersConfiguration.class, MutableClockConfiguration.class })
class StudentUsernameRaceTest {

	static final int ROUNDS = 20;

	static final String STUDENTS = "/api/v1/tutor/students";

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
	void twoConcurrentUsernameOnlyPatchesFromOneVersionGiveOne200AndOneStale409() throws Exception {
		Browser first = tutor();
		Browser second = tutor();
		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			for (int round = 0; round < ROUNDS; round++) {
				Response created = first.post(STUDENTS, "{\"fullName\":\"Race Rename\",\"username\":\"race" + round + "\"}");
				assertThat(created.status()).as(created.body()).isEqualTo(201);
				String sid = created.json().path("student").path("id").asString();
				String nameA = "race" + round + ".a";
				String nameB = "race" + round + ".b";
				CountDownLatch start = new CountDownLatch(1);
				Future<Response> a = pool.submit(() -> {
					start.await();
					return first.send("PATCH", STUDENTS + "/" + sid, "{\"version\":0,\"username\":" + quote(nameA) + "}",
							true);
				});
				Future<Response> b = pool.submit(() -> {
					start.await();
					return second.send("PATCH", STUDENTS + "/" + sid, "{\"version\":0,\"username\":" + quote(nameB) + "}",
							true);
				});
				start.countDown();
				Response ra = a.get(60, TimeUnit.SECONDS);
				Response rb = b.get(60, TimeUnit.SECONDS);

				assertThat(List.of(ra.status(), rb.status())).as("round %d", round).containsExactlyInAnyOrder(200, 409);
				Response winner = (ra.status() == 200) ? ra : rb;
				Response loser = (ra.status() == 200) ? rb : ra;
				assertThat(loser.code()).as("round %d", round).isEqualTo("STALE_VERSION");
				assertThat(winner.json().path("version").asLong()).as("round %d", round).isEqualTo(1);
				var after = first.get(STUDENTS + "/" + sid).json();
				assertThat(after.path("username").asString()).as("round %d", round)
					.isEqualTo(winner.json().path("username").asString())
					.isIn(nameA, nameB);
				assertThat(after.path("version").asLong()).as("round %d", round).isEqualTo(1);
				assertThat(jdbc.queryForObject(
						"SELECT count(*) FROM audit_event WHERE action = 'USERNAME_CHANGED' AND subject_id = ?",
						Integer.class, UUID.fromString(sid)))
					.as("round %d", round)
					.isOne();
			}
		}
		finally {
			pool.shutdownNow();
		}
	}

}
