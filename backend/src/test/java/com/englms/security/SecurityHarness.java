package com.englms.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;

import com.englms.identity.Browser;
import com.englms.identity.Browser.Response;
import com.englms.security.IsolationWorld.Account;
import com.englms.security.PolicyRegistry.Actor;
import com.englms.security.PolicyRegistry.Policy;
import com.englms.shared.web.AudienceVerifier;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

/**
 * Drives the authz matrix and the isolation scan against the real port: builds the world, signs each actor in
 * through {@code POST /api/v1/auth/login} ({@link Browser}, which adds the CSRF header to unsafe methods) and sends a
 * policy's sample request. One fresh world and sign-in per call, so session-ending entries never affect another.
 */
public final class SecurityHarness {

	private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS");

	private final int port;

	private final JdbcTemplate jdbc;

	private final List<IsolationWorldContributor> contributors;

	public SecurityHarness(int port, JdbcTemplate jdbc, List<IsolationWorldContributor> contributors) {
		this.port = port;
		this.jdbc = jdbc;
		this.contributors = contributors;
	}

	public IsolationWorld world() {
		return IsolationWorld.build(jdbc, contributors);
	}

	public Browser browser() {
		return new Browser(port);
	}

	public Browser signedIn(Account account) {
		Browser browser = browser();
		assertThat(browser.login(account.username(), account.password(), false).status())
			.as("sign-in of %s", account.username())
			.isEqualTo(200);
		return browser;
	}

	/** Sends the policy's sample request as {@code actor} in a fresh world. */
	public Response call(Policy policy, Actor actor) {
		IsolationWorld world = world();
		Account acting = switch (actor) {
			case ANONYMOUS, STUDENT_A -> world.studentA();
			case TUTOR -> world.tutor();
			case STUDENT_B_ON_A -> world.studentB();
			case MUST_CHANGE -> world.mustChange();
		};
		Browser browser = (actor == Actor.ANONYMOUS) ? browser() : signedIn(acting);
		String body = (policy.body() != null) ? policy.body().apply(acting) : null;
		return browser.send(policy.method(), world.resolve(policy.path()), body,
				!SAFE_METHODS.contains(policy.method()));
	}

	public void assertStatus(Policy policy, Actor actor) {
		Integer expected = policy.expected().get(actor);
		assertThat(expected).as("%s has no expectation for %s", policy, actor).isNotNull();
		assertThat(call(policy, actor).status()).as("%s as %s", policy, actor).isEqualTo(expected);
	}

	/**
	 * NFR-SEC-01/02: calls the policy as student A (whatever the status: Problem Details echo data too) and fails,
	 * naming the endpoint and each hit, when the headers or the body contain one of B's identifiers or a
	 * {@code SECRET-*} marker (case-insensitive).
	 */
	public void assertNoLeak(Policy policy) {
		IsolationWorld world = world();
		Browser browser = signedIn(world.studentA());
		String body = (policy.body() != null) ? policy.body().apply(world.studentA()) : null;
		Response response = browser.send(policy.method(), world.resolve(policy.path()), body,
				!SAFE_METHODS.contains(policy.method()));
		StringBuilder text = new StringBuilder();
		response.headers().forEach((name, values) -> values.forEach(v -> text.append(name).append(": ").append(v).append('\n')));
		text.append(response.body());
		assertThat(leaks(text.toString(), world)).as("isolation: %s as student A (status %d) leaks", policy,
				response.status())
			.isEmpty();
	}

	static List<String> leaks(String text, IsolationWorld world) {
		List<String> hits = new ArrayList<>();
		String lower = text.toLowerCase(Locale.ROOT);
		world.identifiersOfB()
			.stream()
			.filter(id -> lower.contains(id.toLowerCase(Locale.ROOT)))
			.forEach(id -> hits.add("student B's identifier " + id));
		Matcher secret = IsolationWorld.SECRET.matcher(text);
		while (secret.find()) {
			hits.add("secret marker " + secret.group());
		}
		return hits;
	}

	/** {@code METHOD /pattern} of every handler mapping in L2 scope (the registry must list exactly these). */
	public static Set<String> liveKeys(ApplicationContext context) {
		Set<String> keys = new TreeSet<>();
		for (RequestMappingHandlerMapping mapping : context.getBeansOfType(RequestMappingHandlerMapping.class).values()) {
			for (AudienceVerifier.Handler handler : AudienceVerifier.handlers(mapping)) {
				handler.methods().forEach(method -> handler.patterns().forEach(pattern -> keys.add(method + " " + pattern)));
			}
		}
		return keys;
	}

	/** Fails naming each live mapping without a registry entry and each entry without a live mapping. */
	public static void assertComplete(Set<String> live, Set<String> registered) {
		Set<String> missing = new TreeSet<>(live);
		missing.removeAll(registered);
		Set<String> stale = new TreeSet<>(registered);
		stale.removeAll(live);
		assertThat(missing).as("handler mappings without a policy-registry entry (PolicyRegistry)").isEmpty();
		assertThat(stale).as("policy-registry entries without a live handler mapping").isEmpty();
	}

}
