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

/** T-M2.1 AC4: past the per-IP limit (3 here instead of 30), every sign-in gets 429, whatever the username. */
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=3" })
@Import(TestcontainersConfiguration.class)
class LoginThrottleApiTest {

	@LocalServerPort
	int port;

	@Autowired
	JdbcTemplate jdbc;

	@Test
	void moreAttemptsThanTheLimitFromOneIpAre429WithRetryAfterRegardlessOfUsername() {
		IdentityFixtures.reset(jdbc);
		IdentityFixtures.insert(jdbc, "tutor.one", PASSWORD, Role.TUTOR, false);
		Browser browser = new Browser(port);

		assertThat(browser.login("nobody.1", "x", false).status()).isEqualTo(401);
		assertThat(browser.login("tutor.one", "wrong-password-1", false).status()).isEqualTo(401);
		assertThat(browser.login("tutor.one", PASSWORD, false).status()).isEqualTo(200);
		Response limited = browser.login("tutor.one", PASSWORD, false);
		Response otherUser = new Browser(port).login("someone.else", "x", false);

		for (Response response : new Response[] { limited, otherUser }) {
			assertThat(response.status()).isEqualTo(429);
			assertThat(response.code()).isEqualTo("RATE_LIMITED");
			assertThat(response.header("Content-Type")).startsWith("application/problem+json");
			assertThat(response.header("Cache-Control")).isEqualTo("no-store");
			assertThat(Integer.parseInt(response.header("Retry-After"))).isBetween(1, 300);
		}
		assertThat(jdbc.queryForObject("SELECT count(*) FROM audit_event WHERE action LIKE 'LOGIN_%'", Integer.class))
			.as("throttled attempts never reach the account").isEqualTo(3);
	}

}
