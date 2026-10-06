package com.englms.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.FieldSource;

import com.englms.TestcontainersConfiguration;
import com.englms.security.PolicyRegistry.Policy;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * T-M2.2 AC6/AC7 (NFR-SEC-01, NFR-SEC-02, ADR-0016 §3): student A's response to every registered handler contains
 * none of B's identifiers and no {@code SECRET-*} marker; "B on A's resource" is in the matrix (AuthzMatrixTest).
 */
@Tag("security")
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=100000" })
@Import(TestcontainersConfiguration.class)
class IsolationTest {

	@LocalServerPort
	int port;

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	ObjectProvider<IsolationWorldContributor> contributors;

	SecurityHarness harness;

	@BeforeEach
	void setUp() {
		harness = new SecurityHarness(port, jdbc, contributors.orderedStream().toList());
	}

	@ParameterizedTest(name = "{0}")
	@FieldSource("com.englms.security.PolicyRegistry#ENTRIES")
	void studentAsResponseLeaksNothingOfStudentBOrTheTutor(Policy policy) {
		harness.assertNoLeak(policy);
	}

	@Test
	void theDisabledStudentCannotSignIn() {
		IsolationWorld world = harness.world();
		assertThat(harness.browser().login(world.studentC().username(), world.studentC().password(), false).status())
			.isEqualTo(401);
	}

}
