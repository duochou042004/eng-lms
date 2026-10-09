package com.englms.identity;

import static com.englms.identity.IdentityFixtures.PASSWORD;
import static com.englms.identity.Browser.quote;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import com.englms.TestcontainersConfiguration;
import com.englms.identity.Browser.Response;
import com.englms.identity.internal.app.AccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * T-M2.9 AC7 (DEC-100 S4-5): a login racing a reset by someone else cannot leave a usable session. Deterministic form
 * of the race (no sleeps or wall-clock bounds, DEC-093): the stamp is incremented in the database without ending any
 * session, which is the state such a login leaves. Same context as {@link AuthApiIntegrationTest}.
 */
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=100000" })
@Import(TestcontainersConfiguration.class)
class CredentialStampTest {

	static final String SESSION = "/api/v1/auth/session";

	@LocalServerPort
	int port;

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	AccountService accounts;

	UUID tutorId;

	@BeforeEach
	void setUp() {
		IdentityFixtures.reset(jdbc);
		tutorId = IdentityFixtures.insert(jdbc, "tutor.one", PASSWORD, Role.TUTOR, false);
	}

	Browser signedIn(String username, String password, boolean rememberMe) {
		Browser browser = new Browser(port);
		assertThat(browser.login(username, password, rememberMe).status()).as("sign-in of %s", username).isEqualTo(200);
		return browser;
	}

	void bumpStamp(UUID userId) {
		jdbc.update("UPDATE user_account SET credential_stamp = credential_stamp + 1 WHERE id = ?", userId);
	}

	long stamp(UUID userId) {
		return jdbc.queryForObject("SELECT credential_stamp FROM user_account WHERE id = ?", Long.class, userId);
	}

	int count(String sql, Object... args) {
		return jdbc.queryForObject(sql, Integer.class, args);
	}

	@Test
	void aSessionWithAnOlderStampIs401AndEndsWithItsRememberMeTokenWhileALaterSignInKeepsWorking() {
		UUID id = IdentityFixtures.insert(jdbc, "raced.stamp", PASSWORD, Role.STUDENT, false);
		Browser raced = signedIn("raced.stamp", PASSWORD, true);
		Browser other = signedIn("raced.stamp", PASSWORD, false);
		String series = jdbc.queryForObject("SELECT series FROM persistent_logins WHERE username = ?", String.class,
				id.toString());
		List<String> cookies = List.of(raced.cookies.get(Browser.SESSION), raced.cookies.get(Browser.REMEMBER_ME));
		bumpStamp(id);
		Browser later = signedIn("raced.stamp", PASSWORD, false);

		Response refused = raced.get(SESSION);

		assertThat(refused.status()).isEqualTo(401);
		assertThat(refused.code()).isEqualTo("SESSION_EXPIRED");
		assertThat(raced.cookies).as("both cookies are cleared").doesNotContainKeys(Browser.SESSION, Browser.REMEMBER_ME);
		assertThat(count("SELECT count(*) FROM persistent_logins WHERE series = ?", series)).isZero();
		assertThat(count("SELECT count(*) FROM spring_session WHERE principal_name = ?", id.toString()))
			.as("only the refused session ended").isEqualTo(2);
		Browser replay = new Browser(port);
		replay.cookies.put(Browser.SESSION, cookies.get(0));
		replay.cookies.put(Browser.REMEMBER_ME, cookies.get(1));
		assertThat(replay.get(SESSION).status()).as("the same cookies are anonymous now").isEqualTo(401);
		assertThat(later.get(SESSION).status()).as("signed in after the stamp changed").isEqualTo(200);
		assertThat(other.get(SESSION).code()).as("an older session is refused on its own next request")
			.isEqualTo("SESSION_EXPIRED");
		assertThat(later.get(SESSION).status()).isEqualTo(200);
	}

	@Test
	void aProtectedRequestWithAnOlderStampIs401SessionExpired() {
		Browser tutor = signedIn("tutor.one", PASSWORD, false);
		bumpStamp(tutorId);

		Response refused = tutor.get("/api/v1/tutor/students");

		assertThat(refused.status()).isEqualTo(401);
		assertThat(refused.code()).isEqualTo("SESSION_EXPIRED");
		assertThat(count("SELECT count(*) FROM spring_session WHERE principal_name = ?", tutorId.toString())).isZero();
	}

	/** A session created by remember-me sign-in records the stamp it read, like a password sign-in. */
	@Test
	void aRememberMeSignInWithAnOlderStampIsRefusedAndItsTokenEnds() {
		UUID id = IdentityFixtures.insert(jdbc, "raced.remembered", PASSWORD, Role.STUDENT, false);
		Browser remembered = signedIn("raced.remembered", PASSWORD, true);
		remembered.cookies.remove(Browser.SESSION);
		assertThat(remembered.get(SESSION).status()).as("signed in by remember-me").isEqualTo(200);
		assertThat(remembered.cookies).containsKeys(Browser.SESSION, Browser.REMEMBER_ME);
		String token = remembered.cookies.get(Browser.REMEMBER_ME);
		bumpStamp(id);

		Response refused = remembered.get(SESSION);

		assertThat(refused.status()).isEqualTo(401);
		assertThat(refused.code()).isEqualTo("SESSION_EXPIRED");
		assertThat(count("SELECT count(*) FROM persistent_logins WHERE username = ?", id.toString())).isZero();
		Browser replay = new Browser(port);
		replay.cookies.put(Browser.REMEMBER_ME, token);
		assertThat(replay.get(SESSION).status()).isEqualTo(401);
	}

	/**
	 * A reset that commits between the login's account read and its remember-me insert: a test-only trigger increments
	 * the stamp as the token is inserted (the state such a reset leaves, without timing). The token is deleted, no
	 * cookie is set, and the session is refused on its next request.
	 */
	@Test
	void aLoginRacingAResetKeepsNoRememberMeToken() {
		UUID id = IdentityFixtures.insert(jdbc, "raced.token", PASSWORD, Role.STUDENT, false);
		jdbc.execute("""
				CREATE FUNCTION app.bump_stamp_probe() RETURNS trigger LANGUAGE plpgsql AS $$
				BEGIN
				    UPDATE app.user_account SET credential_stamp = credential_stamp + 1 WHERE id = NEW.username::uuid;
				    RETURN NEW;
				END $$""");
		jdbc.execute("CREATE TRIGGER tr_bump_stamp_probe AFTER INSERT ON app.persistent_logins FOR EACH ROW "
				+ "EXECUTE FUNCTION app.bump_stamp_probe()");
		Browser browser = new Browser(port);
		Response login;
		try {
			login = browser.login("raced.token", PASSWORD, true);
		}
		finally {
			jdbc.execute("DROP TRIGGER tr_bump_stamp_probe ON app.persistent_logins");
			jdbc.execute("DROP FUNCTION app.bump_stamp_probe()");
		}

		assertThat(login.status()).isEqualTo(200);
		assertThat(login.setCookie(Browser.REMEMBER_ME)).isNull();
		assertThat(count("SELECT count(*) FROM persistent_logins WHERE username = ?", id.toString())).isZero();
		assertThat(browser.get(SESSION).code()).isEqualTo("SESSION_EXPIRED");
		assertThat(signedIn("raced.token", PASSWORD, true).get(SESSION).status()).isEqualTo(200);
	}

	@Test
	void aTutorResetIncrementsTheStampAndASignInWithTheNewPasswordWorks() {
		UUID id = IdentityFixtures.insert(jdbc, "reset.stamp", PASSWORD, Role.STUDENT, false);
		UUID sid = UUID.randomUUID();
		jdbc.update("""
				INSERT INTO student (id, user_id, full_name, search_text, status, created_at, updated_at)
				VALUES (?, ?, 'Reset Stamp', 'reset stamp', 'ACTIVE', now(), now())""", sid, id);
		Browser tutor = signedIn("tutor.one", PASSWORD, false);

		Response reset = tutor.post("/api/v1/tutor/students/" + sid + "/password-reset", null);

		assertThat(reset.status()).isEqualTo(200);
		assertThat(stamp(id)).isOne();
		Browser fresh = signedIn("reset.stamp", reset.json().path("temporaryPassword").asString(), false);
		assertThat(fresh.get(SESSION).status()).isEqualTo(200);
		assertThat(tutor.get(SESSION).status()).as("the tutor's own stamp is unchanged").isEqualTo(200);
	}

	@Test
	void theOperatorResetIncrementsTheTutorsStamp() {
		Browser tutor = signedIn("tutor.one", PASSWORD, false);

		accounts.resetTutorPasswordByOperator();

		assertThat(stamp(tutorId)).isOne();
		assertThat(tutor.get(SESSION).status()).isEqualTo(401);
	}

	@Test
	void theOwnPasswordChangeKeepsTheStampAndTheCurrentSession() {
		UUID id = IdentityFixtures.insert(jdbc, "own.change", PASSWORD, Role.STUDENT, false);
		Browser browser = signedIn("own.change", PASSWORD, true);

		assertThat(browser.post("/api/v1/auth/password", "{\"currentPassword\":" + quote(PASSWORD)
				+ ",\"newPassword\":\"a-brand-new-secret\"}").status()).isEqualTo(204);

		assertThat(stamp(id)).isZero();
		assertThat(browser.get(SESSION).status()).isEqualTo(200);
		assertThat(browser.get("/api/v1/tutor/students").code()).as("still signed in (wrong role, not 401)")
			.isEqualTo("FORBIDDEN_ROLE");
	}

	@Test
	void noResponseCarriesTheStamp() {
		UUID id = IdentityFixtures.insert(jdbc, "plain.user", PASSWORD, Role.STUDENT, false);
		jdbc.update("UPDATE user_account SET credential_stamp = 987654321 WHERE id = ?", id);
		Browser browser = new Browser(port);
		Response login = browser.login("plain.user", PASSWORD, true);
		Response session = browser.get(SESSION);

		assertThat(List.of(login, session)).allSatisfy(response -> {
			assertThat(response.status()).isEqualTo(200);
			assertThat(response.body().toLowerCase(Locale.ROOT)).doesNotContain("stamp", "987654321");
			assertThat(response.json().propertyNames()).doesNotContain("credentialStamp");
			assertThat(response.headers().toString()).doesNotContain("987654321");
		});
	}

}
