package com.englms.identity;

import static com.englms.identity.IdentityFixtures.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import com.englms.TestcontainersConfiguration;
import com.englms.identity.Browser.Response;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * T-M2.33 AC3 (DEC-200 (2)): binding precedes {@code LoginThrottle}, so a sign-in body refused with 400
 * {@code MALFORMED_REQUEST} is not counted and runs no credential check. Its own limit (2), so no other class shares
 * this context's throttle.
 */
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=2" })
@Import(TestcontainersConfiguration.class)
class LoginBindingThrottleApiTest {

	static final int LIMIT = 2;

	@LocalServerPort
	int port;

	@Autowired
	JdbcTemplate jdbc;

	@Test
	void numericPasswordsPastTheLimitAre400AndUncountedThenACorrectSignInSucceeds() {
		IdentityFixtures.reset(jdbc);
		IdentityFixtures.insert(jdbc, "tutor.one", PASSWORD, Role.TUTOR, false);
		Browser browser = new Browser(port);

		for (int i = 0; i <= LIMIT; i++) {
			Response refused = browser.post("/api/v1/auth/login", "{\"username\":\"tutor.one\",\"password\":123456}");
			assertThat(refused.status()).as("attempt %d: %s", i, refused.body()).isEqualTo(400);
			assertThat(refused.code()).isEqualTo("MALFORMED_REQUEST");
		}
		assertThat(jdbc.queryForObject("SELECT count(*) FROM audit_event", Integer.class)).as("no credential check")
			.isZero();
		assertThat(jdbc.queryForObject("SELECT failed_login_count FROM user_account", Integer.class)).isZero();

		assertThat(browser.login("tutor.one", PASSWORD, false).status()).isEqualTo(200);
	}

}
