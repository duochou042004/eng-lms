package com.englms.shared.web;

import static com.englms.identity.IdentityFixtures.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import com.englms.MutableClockConfiguration;
import com.englms.TestcontainersConfiguration;
import com.englms.identity.Browser;
import com.englms.identity.Browser.Response;
import com.englms.identity.IdentityFixtures;
import com.englms.identity.Role;
import com.englms.settings.SettingsWorldContributor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.logging.LogLevel;
import org.springframework.boot.logging.LoggingSystem;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * T-M2.7 AC11 (DEC-202 S4-1, DEC-186 SEC S4-1): with DEBUG on for {@code org.springframework.web} and
 * {@code com.englms}, a JSON scalar of the wrong type is answered with the unchanged 400 {@code MALFORMED_REQUEST} and
 * its sent value reaches no log line. Same context as {@code StrictJsonScalarsApiTest}; the levels are set at run time
 * and restored after each test.
 */
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=100000" })
@Import({ TestcontainersConfiguration.class, MutableClockConfiguration.class })
@ExtendWith(OutputCaptureExtension.class)
class MismatchedScalarLoggingTest {

	static final String[] DEBUG_LOGGERS = { "org.springframework.web", "com.englms" };

	@LocalServerPort
	int port;

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	LoggingSystem logging;

	@BeforeEach
	void setUp() {
		SettingsWorldContributor.resetWorkspace(jdbc);
		IdentityFixtures.reset(jdbc);
		IdentityFixtures.insert(jdbc, "tutor.one", PASSWORD, Role.TUTOR, false);
		for (String logger : DEBUG_LOGGERS) {
			logging.setLogLevel(logger, LogLevel.DEBUG);
		}
	}

	@AfterEach
	void restore() {
		for (String logger : DEBUG_LOGGERS) {
			logging.setLogLevel(logger, null);
		}
		SettingsWorldContributor.resetWorkspace(jdbc);
	}

	@Test
	void aNumericCredentialIsAnswered400AndItsValueIsNotLogged(CapturedOutput output) {
		Response password = new Browser(port).login("tutor.one", PASSWORD, false);
		assertThat(password.status()).isEqualTo(200);
		Browser browser = new Browser(port);
		Response numericPassword = browser.post("/api/v1/auth/login",
				"{\"username\":\"tutor.one\",\"password\":987654321,\"rememberMe\":false}");
		Response numericUsername = browser.post("/api/v1/auth/login",
				"{\"username\":424242427,\"password\":\"whatever-password\",\"rememberMe\":false}");

		StrictJsonScalarsApiTest.assertMalformed(numericPassword, "password");
		StrictJsonScalarsApiTest.assertMalformed(numericUsername, "username");
		assertDebugWasOn(output);
		assertThat(output.getAll()).doesNotContain("987654321", "424242427");
	}

	@Test
	void aBooleanWorkspaceNameIsAnswered400AndItsValueIsNotLogged(CapturedOutput output) {
		Browser tutor = new Browser(port);
		assertThat(tutor.login("tutor.one", PASSWORD, false).status()).isEqualTo(200);
		Response response = tutor.send("PATCH", "/api/v1/tutor/settings", "{\"version\":0,\"displayName\":true}", true);

		StrictJsonScalarsApiTest.assertMalformed(response, "displayName");
		assertDebugWasOn(output);
		// "true" alone occurs in unrelated lines; the value is the token Jackson's message quotes.
		assertThat(output.getAll()).doesNotContainPattern("(?i)boolean[^\\n]{0,40}\\(true\\)")
			.doesNotContainPattern("(?i)value \\(true\\)");
	}

	/** The redaction is only proven when the DEBUG lines that used to carry the value were written. */
	static void assertDebugWasOn(CapturedOutput output) {
		assertThat(output.getAll()).contains("HttpMessageNotReadableException");
	}

}
