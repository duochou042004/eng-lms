package com.englms.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import com.englms.TestcontainersConfiguration;
import com.englms.security.PolicyRegistry.Actor;
import com.englms.security.PolicyRegistry.Policy;
import com.englms.shared.web.AudienceVerifier;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * T-M2.2 AC3/AC4 (NFR-SEC-03): every handler mapping has a policy-registry entry and vice versa, and every entry
 * answers each actor with its expected status on the real port. The per-IP sign-in throttle is raised, as in
 * AuthApiIntegrationTest (same context).
 */
@Tag("security")
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=100000" })
@Import(TestcontainersConfiguration.class)
class AuthzMatrixTest {

	@LocalServerPort
	int port;

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	ApplicationContext context;

	@Autowired
	ObjectProvider<IsolationWorldContributor> contributors;

	SecurityHarness harness;

	@BeforeEach
	void setUp() {
		harness = new SecurityHarness(port, jdbc, contributors.orderedStream().toList());
	}

	@Test
	void everyHandlerMappingHasARegistryEntryAndEveryEntryAMapping() {
		SecurityHarness.assertComplete(SecurityHarness.liveKeys(context), PolicyRegistry.keys(PolicyRegistry.ENTRIES));
	}

	@Test
	void theL2VerifierRunsInTheApplication() {
		assertThat(context.getBeanProvider(AudienceVerifier.class).getIfAvailable()).isNotNull();
	}

	static Stream<Arguments> calls() {
		return PolicyRegistry.ENTRIES.stream()
			.flatMap(policy -> policy.expected().keySet().stream().sorted().map(actor -> Arguments.of(policy, actor)));
	}

	@ParameterizedTest(name = "{0} as {1}")
	@MethodSource("calls")
	void answersEachActorAsRegistered(Policy policy, Actor actor) {
		harness.assertStatus(policy, actor);
	}

}
