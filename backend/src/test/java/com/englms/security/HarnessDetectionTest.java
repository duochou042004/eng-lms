package com.englms.security;

import static com.englms.security.PolicyRegistry.NA;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import com.englms.TestcontainersConfiguration;
import com.englms.identity.CurrentUser;
import com.englms.security.PolicyRegistry.Actor;
import com.englms.security.PolicyRegistry.Policy;
import com.englms.shared.web.Audience;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Proves that the harness detects what it must (T-M2.2 AC4, AC6, AC7): test-only handlers and a world contributor
 * added to the application context make the completeness check, the isolation scan and the "B on A's resource" check
 * fail, naming the endpoint and the hit. No production resource is student-owned yet, so the owner-scoped handler is
 * a fixture too.
 */
@Tag("security")
@Tag("container")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT,
		properties = { "management.server.port=0", "englms.security.login-throttle.max-attempts=100000" })
@Import({ TestcontainersConfiguration.class, HarnessDetectionTest.Items.class, HarnessDetectionTest.StudentFixtures.class,
		HarnessDetectionTest.UnregisteredTutorProbe.class })
class HarnessDetectionTest {

	static final Policy LEAK_ID = Policy.of("GET", "/api/v1/student/harness/leak-id", null, 401, 403, 200, NA, 403);

	static final Policy LEAK_SECRET = Policy.of("GET", "/api/v1/student/harness/leak-secret", null, 401, 403, 204, NA,
			403);

	static final Policy ITEM = Policy.of("GET", "/api/v1/student/harness/items/{itemId}", null, 401, 403, 200, 404, 403);

	static final Policy UNSCOPED_ITEM = Policy.of("GET", "/api/v1/student/harness/unscoped-items/{itemId}", null, 401,
			403, 200, 404, 403);

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
	Items items;

	SecurityHarness harness;

	@BeforeEach
	void setUp() {
		harness = new SecurityHarness(port, jdbc, contributors.orderedStream().toList());
	}

	// ---- AC4 -------------------------------------------------------------------------------------------------

	@Test
	void completenessNamesAHandlerMappingWithoutAnEntry() {
		Set<String> live = SecurityHarness.liveKeys(context);

		assertThatThrownBy(() -> SecurityHarness.assertComplete(live, PolicyRegistry.keys(PolicyRegistry.ENTRIES)))
			.hasMessageContaining("without a policy-registry entry")
			.hasMessageContaining(PROBE);
	}

	@Test
	void completenessNamesAnEntryWithoutAHandlerMapping() {
		List<Policy> all = new ArrayList<>(PolicyRegistry.ENTRIES);
		all.addAll(List.of(LEAK_ID, LEAK_SECRET, ITEM, UNSCOPED_ITEM));
		Set<String> registered = new HashSet<>(PolicyRegistry.keys(all));
		registered.add(PROBE);
		SecurityHarness.assertComplete(SecurityHarness.liveKeys(context), registered);

		registered.add("DELETE /api/v1/tutor/harness-gone");
		assertThatThrownBy(() -> SecurityHarness.assertComplete(SecurityHarness.liveKeys(context), registered))
			.hasMessageContaining("without a live handler mapping")
			.hasMessageContaining("DELETE /api/v1/tutor/harness-gone");
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

	/** A world contributor: one item for A, one for B, and a secret marker in B's item. */
	static class Items implements IsolationWorldContributor {

		final Map<UUID, UUID> ownerOfItem = new ConcurrentHashMap<>();

		volatile UUID studentB;

		@Override
		public void contribute(IsolationWorld world) {
			UUID itemOfA = UUID.randomUUID();
			UUID itemOfB = UUID.randomUUID();
			ownerOfItem.put(itemOfA, world.studentA().id());
			ownerOfItem.put(itemOfB, world.studentB().id());
			studentB = world.studentB().id();
			world.ownedByA("itemId", itemOfA);
			world.ownedByB(itemOfB);
			world.secret("SECRET-ITEM-B-7F3C");
		}

		@Override
		public void reset() {
			ownerOfItem.clear();
		}

	}

	@RestController
	@Audience(Audience.Kind.STUDENT)
	@RequestMapping("/api/v1/student/harness")
	static class StudentFixtures {

		private final Items items;

		StudentFixtures(Items items) {
			this.items = items;
		}

		/** Leaks B's user ID, upper-cased, in the body. */
		@GetMapping("/leak-id")
		Map<String, String> leakId() {
			return Map.of("peer", items.studentB.toString().toUpperCase());
		}

		/** Leaks a secret marker, lower-cased, in a header. */
		@GetMapping("/leak-secret")
		ResponseEntity<Void> leakSecret() {
			return ResponseEntity.noContent().header("X-Fixture-Note", "secret-item-b-7f3c").build();
		}

		/** Owner-scoped: someone else's item is a 404 (ADR-0016 §3). */
		@GetMapping("/items/{itemId}")
		Map<String, UUID> item(@PathVariable UUID itemId, @AuthenticationPrincipal CurrentUser me) {
			if (!me.userId().equals(items.ownerOfItem.get(itemId))) {
				throw new ResponseStatusException(HttpStatus.NOT_FOUND);
			}
			return Map.of("id", itemId);
		}

		/** Not owner-scoped: the bug the "B on A's resource" check exists for. */
		@GetMapping("/unscoped-items/{itemId}")
		Map<String, UUID> unscopedItem(@PathVariable UUID itemId) {
			return Map.of("id", itemId);
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
