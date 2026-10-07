package com.englms.security;

import static com.englms.security.PolicyRegistry.NA;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import com.englms.TestcontainersConfiguration;
import com.englms.identity.Browser;
import com.englms.identity.Browser.Response;
import com.englms.identity.IdentityFixtures;
import com.englms.identity.Role;
import fixture.harness.HarnessItems;
import fixture.harness.web.student.HarnessStudentHandlers;
import com.englms.security.PolicyRegistry.Actor;
import com.englms.security.PolicyRegistry.Policy;
import com.englms.shared.web.Audience;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.config.annotation.DelegatingWebMvcConfiguration;

/**
 * Proves that the harness detects what it must (T-M2.2 AC4, AC6, AC7): test-only handlers and a world contributor
 * added to the application context make the completeness check, the isolation scan and the "B on A's resource" check
 * fail, naming the endpoint and the hit. No production resource is student-owned yet, so the owner-scoped handler is
 * a fixture too; it takes {@code CurrentStudent} (T-M2.3 AC8), which is also tested here. The student handlers and the contributor live in {@code fixture.harness} (the L2 verifier requires
 * {@code STUDENT} handlers in a {@code ..web.student..} package).
 */
@Tag("security")
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=100000" })
@Import({ TestcontainersConfiguration.class, HarnessItems.class, HarnessStudentHandlers.class,
		HarnessDetectionTest.UnregisteredTutorProbe.class })
class HarnessDetectionTest {

	static final Policy LEAK_ID = Policy.of("GET", "/api/v1/student/harness/leak-id", null, 401, 403, 200, NA, 403);

	static final Policy LEAK_SECRET = Policy.of("GET", "/api/v1/student/harness/leak-secret", null, 401, 403, 204, NA,
			403);

	static final Policy ITEM = Policy.of("GET", "/api/v1/student/harness/items/{itemId}", null, 401, 403, 200, 404, 403);

	static final Policy UNSCOPED_ITEM = Policy.of("GET", "/api/v1/student/harness/unscoped-items/{itemId}", null, 401,
			403, 200, 404, 403);

	static final Policy ME = Policy.of("GET", "/api/v1/student/harness/me", null, 401, 403, 200, NA, 403);

	static final String PROBE = "GET /api/v1/tutor/harness-probe";

	@LocalServerPort
	int port;

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	ApplicationContext context;

	@Autowired
	ObjectProvider<IsolationWorldContributor> contributors;

	@Autowired
	HarnessItems items;

	SecurityHarness harness;

	@BeforeEach
	void setUp() {
		harness = new SecurityHarness(port, jdbc, contributors.orderedStream().toList());
	}

	// ---- AC4 -------------------------------------------------------------------------------------------------

	@Test
	void completenessNamesAHandlerMappingWithoutAnEntry() {
		Map<String, List<String>> live = SecurityHarness.liveKeys(context);

		assertThatThrownBy(() -> SecurityHarness.assertComplete(live, PolicyRegistry.keys(PolicyRegistry.ENTRIES)))
			.hasMessageContaining("without a policy-registry entry")
			.hasMessageContaining(PROBE);
	}

	@Test
	void completenessNamesAnEntryWithoutAHandlerMapping() {
		List<Policy> all = new ArrayList<>(PolicyRegistry.ENTRIES);
		all.addAll(List.of(LEAK_ID, LEAK_SECRET, ITEM, UNSCOPED_ITEM, ME));
		Set<String> registered = new HashSet<>(PolicyRegistry.keys(all));
		registered.add(PROBE);
		SecurityHarness.assertComplete(SecurityHarness.liveKeys(context), registered);

		registered.add("DELETE /api/v1/tutor/harness-gone");
		assertThatThrownBy(() -> SecurityHarness.assertComplete(SecurityHarness.liveKeys(context), registered))
			.hasMessageContaining("without a live handler mapping")
			.hasMessageContaining("DELETE /api/v1/tutor/harness-gone");
	}

	@Test
	void completenessNamesAKeyServedByTwoHandlerMethods() {
		new WebApplicationContextRunner().withUserConfiguration(DelegatingWebMvcConfiguration.class, SameKeyTwice.class).run(mvc -> {
			assertThat(mvc).hasNotFailed();
			assertThatThrownBy(() -> SecurityHarness.assertComplete(SecurityHarness.liveKeys(mvc),
					Set.of("GET /api/v1/tutor/harness-twice")))
				.hasMessageContaining("more than one handler method")
				.hasMessageContaining("GET /api/v1/tutor/harness-twice")
				.hasMessageContaining(SameKeyTwice.class.getName() + "#summary")
				.hasMessageContaining(SameKeyTwice.class.getName() + "#full");
		});
	}

	// ---- AC6 -------------------------------------------------------------------------------------------------

	@Test
	void theScanNamesStudentBsIdentifierInTheBodyWhateverItsCase() {
		assertThatThrownBy(() -> harness.assertNoLeak(LEAK_ID)).hasMessageContaining(LEAK_ID.key())
			.hasMessageContaining("student B's identifier " + items.studentB);
	}

	@Test
	void theScanNamesASecretMarkerInAHeaderWhateverItsCase() {
		assertThatThrownBy(() -> harness.assertNoLeak(LEAK_SECRET)).hasMessageContaining(LEAK_SECRET.key())
			.hasMessageContaining("secret marker secret-item-b-7f3c");
	}

	@Test
	void theScanPassesForAnOwnerScopedHandler() {
		harness.assertNoLeak(ITEM);
	}

	// ---- AC7 -------------------------------------------------------------------------------------------------

	@ParameterizedTest
	@EnumSource(Actor.class)
	void anOwnerScopedHandlerAnswersEachActorAsRegisteredIncludingBOnAsResource(Actor actor) {
		harness.assertStatus(ITEM, actor);
	}

	@Test
	void aHandlerThatIsNotOwnerScopedFailsTheBOnAsResourceCheck() {
		harness.assertStatus(UNSCOPED_ITEM, Actor.STUDENT_A);
		assertThatThrownBy(() -> harness.assertStatus(UNSCOPED_ITEM, Actor.STUDENT_B_ON_A))
			.hasMessageContaining(UNSCOPED_ITEM.key() + " as STUDENT_B_ON_A")
			.hasMessageContaining("404");
	}

	// ---- T-M2.3 AC8: CurrentStudent ----------------------------------------------------------------------------

	@ParameterizedTest
	@EnumSource(value = Actor.class, names = "STUDENT_B_ON_A", mode = EnumSource.Mode.EXCLUDE)
	void aCurrentStudentHandlerAnswersEachActorAsRegistered(Actor actor) {
		harness.assertStatus(ME, actor);
	}

	@Test
	void currentStudentCarriesTheSignedInStudentsIds() {
		IsolationWorld world = harness.world();
		Response response = harness.signedIn(world.studentA()).get(ME.path());

		assertThat(response.status()).isEqualTo(200);
		assertThat(response.json().path("userId").asString()).isEqualTo(world.studentA().id().toString());
		assertThat(response.json().path("studentId").asString())
			.isEqualTo(items.studentIdOf(world.studentA().id()).toString());
		harness.assertNoLeak(ME);
	}

	@Test
	void aStudentAccountWithoutAStudentRowGets401SessionExpiredAndItsSessionEnds() {
		harness.world();
		UUID orphan = IdentityFixtures.insert(jdbc, "student-orphan", IdentityFixtures.PASSWORD, Role.STUDENT, false);
		Browser browser = harness.signedIn(new IsolationWorld.Account(orphan, "student-orphan"));

		Response response = browser.get(ME.path());

		assertThat(response.status()).isEqualTo(401);
		assertThat(response.code()).isEqualTo("SESSION_EXPIRED");
		assertThat(jdbc.queryForObject("SELECT count(*) FROM spring_session WHERE principal_name = ?", Integer.class,
				orphan.toString())).isZero();
		assertThat(browser.cookies).as("the session cookie is cleared").doesNotContainKey(Browser.SESSION);
	}

	/** Two handlers on one {@code METHOD pattern}, told apart only by a request parameter (SEC S3-2). */
	@RestController
	@Audience(Audience.Kind.TUTOR)
	static class SameKeyTwice {

		@GetMapping("/api/v1/tutor/harness-twice")
		String summary() {
			return "summary";
		}

		@GetMapping(path = "/api/v1/tutor/harness-twice", params = "full")
		String full() {
			return "full";
		}

	}

	@RestController
	static class UnregisteredTutorProbe {

		@GetMapping("/api/v1/tutor/harness-probe")
		@Audience(Audience.Kind.TUTOR)
		String probe() {
			return "probe";
		}

	}

}
