package com.englms.students;

import static com.englms.identity.IdentityFixtures.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
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
import com.englms.identity.AccountApi;
import com.englms.identity.Browser;
import com.englms.identity.Browser.Response;
import com.englms.identity.IdentityFixtures;
import com.englms.identity.Role;
import com.englms.shared.ProblemCodes;
import com.englms.shared.ProblemException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * T-M2.3 AC2: two creates of one username race; exactly one wins (201) and the other gets 409 {@code USERNAME_TAKEN},
 * whether the existence check or the database index ({@code ux_user_account__username_normalized}) catches it. No
 * timing bound (DEC-093): a start latch for the HTTP race, and for the index path a condition (the second insert
 * waits on the first transaction's lock) instead of a delay. Same context as {@link StudentsApiIntegrationTest}.
 */
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=100000",
				"spring.jpa.properties.hibernate.generate_statistics=true" })
@Import({ TestcontainersConfiguration.class, MutableClockConfiguration.class })
class StudentCreateRaceTest {

	@LocalServerPort
	int port;

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	AccountApi accounts;

	@Autowired
	TransactionTemplate transactions;

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
	void twoConcurrentCreatesOfOneUsernameGiveOne201AndOne409() throws Exception {
		Browser first = tutor();
		Browser second = tutor();
		CountDownLatch start = new CountDownLatch(1);
		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			Future<Response> a = pool.submit(() -> {
				start.await();
				return first.post("/api/v1/tutor/students", "{\"fullName\":\"Race A\",\"username\":\"Race.User\"}");
			});
			Future<Response> b = pool.submit(() -> {
				start.await();
				return second.post("/api/v1/tutor/students", "{\"fullName\":\"Race B\",\"username\":\" race.user \"}");
			});
			start.countDown();
			List<Response> responses = List.of(a.get(60, TimeUnit.SECONDS), b.get(60, TimeUnit.SECONDS));

			assertThat(responses).extracting(Response::status).containsExactlyInAnyOrder(201, 409);
			Response conflict = responses.stream().filter(r -> r.status() == 409).findFirst().orElseThrow();
			assertThat(conflict.code()).isEqualTo("USERNAME_TAKEN");
			assertThat(conflict.json().path("errors").get(0).path("field").asString()).isEqualTo("username");
		}
		finally {
			pool.shutdownNow();
		}
		assertThat(jdbc.queryForObject("SELECT count(*) FROM user_account WHERE username_normalized = 'race.user'",
				Integer.class)).isOne();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM student", Integer.class)).isOne();
	}

	@Test
	void theUniqueIndexCatchesACreateThatPassedTheExistenceCheck() throws Exception {
		CountDownLatch inserted = new CountDownLatch(1);
		CountDownLatch commit = new CountDownLatch(1);
		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			Future<?> winner = pool.submit(() -> transactions.executeWithoutResult(status -> {
				accounts.createStudentAccount("index.race", null);
				inserted.countDown();
				await(commit);
			}));
			inserted.await(60, TimeUnit.SECONDS);
			// The winner's row is inserted but not committed: the loser's existence check cannot see it.
			Future<?> loser = pool.submit(() -> transactions.executeWithoutResult(
					status -> accounts.createStudentAccount("INDEX.race", null)));
			waitUntilAnInsertWaitsOnALock();
			commit.countDown();
			winner.get(60, TimeUnit.SECONDS);

			assertThatThrownBy(() -> loser.get(60, TimeUnit.SECONDS)).hasCauseInstanceOf(ProblemException.class)
				.cause()
				.satisfies(ex -> assertThat(((ProblemException) ex).code()).isEqualTo(ProblemCodes.USERNAME_TAKEN));
		}
		finally {
			commit.countDown();
			pool.shutdownNow();
		}
		assertThat(jdbc.queryForObject("SELECT count(*) FROM user_account WHERE username_normalized = 'index.race'",
				Integer.class)).isOne();
	}

	/** Polls PostgreSQL until a backend waits on a lock (the loser's insert on the winner's index entry). */
	void waitUntilAnInsertWaitsOnALock() throws InterruptedException {
		for (int i = 0; i < 3000; i++) {
			Integer waiting = jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() "
					+ "AND wait_event_type = 'Lock' AND query ILIKE 'insert into%user_account%'", Integer.class);
			if (waiting > 0) {
				return;
			}
			Thread.sleep(20);
		}
		throw new AssertionError("the second insert never waited on the first transaction");
	}

	static void await(CountDownLatch latch) {
		try {
			latch.await(60, TimeUnit.SECONDS);
		}
		catch (InterruptedException ex) {
			Thread.currentThread().interrupt();
		}
	}

}
