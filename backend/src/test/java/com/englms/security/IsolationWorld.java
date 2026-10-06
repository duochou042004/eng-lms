package com.englms.security;

import static com.englms.identity.IdentityFixtures.PASSWORD;

import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.englms.identity.IdentityFixtures;
import com.englms.identity.Role;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * The isolation fixture world (test-strategy §2) as far as identity exists: the tutor, students A and B (active), C
 * (disabled; archived arrives with the students module) and a student who must change the password. Usernames carry a
 * random suffix, so a substring hit in a scan is never a coincidence. All accounts use {@link IdentityFixtures#PASSWORD}.
 * Rebuilt for every test (the reset deletes every session).
 */
public final class IsolationWorld {

	/** The marker pattern every {@code SECRET-*} fixture value matches; the scan searches for it case-insensitively. */
	public static final Pattern SECRET = Pattern.compile("SECRET-[A-Z0-9-]+", Pattern.CASE_INSENSITIVE);

	private static final Pattern VARIABLE = Pattern.compile("\\{(\\w+)}");

	public record Account(UUID id, String username) {

		public String password() {
			return PASSWORD;
		}

	}

	private final Account tutor;

	private final Account studentA;

	private final Account studentB;

	private final Account studentC;

	private final Account mustChange;

	private final Map<String, String> resourcesOfA = new HashMap<>();

	private final Set<String> identifiersOfB = new HashSet<>();

	private IsolationWorld(JdbcTemplate jdbc) {
		String suffix = HexFormat.of().toHexDigits(ThreadLocalRandom.current().nextInt());
		tutor = account(jdbc, "tutor-" + suffix, Role.TUTOR, false);
		studentA = account(jdbc, "student-a-" + suffix, Role.STUDENT, false);
		studentB = account(jdbc, "student-b-" + suffix, Role.STUDENT, false);
		studentC = account(jdbc, "student-c-" + suffix, Role.STUDENT, false);
		jdbc.update("UPDATE user_account SET status = 'DISABLED' WHERE id = ?", studentC.id());
		mustChange = account(jdbc, "student-m-" + suffix, Role.STUDENT, true);
		ownedByB(studentB.id());
		ownedByB(studentB.username());
	}

	/** Resets the database (contributors first) and builds a fresh world. */
	public static IsolationWorld build(JdbcTemplate jdbc, List<IsolationWorldContributor> contributors) {
		contributors.forEach(IsolationWorldContributor::reset);
		IdentityFixtures.reset(jdbc);
		IsolationWorld world = new IsolationWorld(jdbc);
		contributors.forEach(contributor -> contributor.contribute(world));
		return world;
	}

	private static Account account(JdbcTemplate jdbc, String username, Role role, boolean mustChange) {
		return new Account(IdentityFixtures.insert(jdbc, username, PASSWORD, role, mustChange), username);
	}

	public Account tutor() {
		return tutor;
	}

	public Account studentA() {
		return studentA;
	}

	public Account studentB() {
		return studentB;
	}

	/** Disabled: cannot sign in, so never an acting student. */
	public Account studentC() {
		return studentC;
	}

	public Account mustChange() {
		return mustChange;
	}

	/** A resource of student A; registry sample paths name it as the path variable {@code {key}}. */
	public void ownedByA(String key, Object id) {
		resourcesOfA.put(key, id.toString());
	}

	/** An identifier of student B's data; student A's responses must never contain it. */
	public void ownedByB(Object id) {
		identifiersOfB.add(id.toString());
	}

	/**
	 * Declares a marker placed in a tutor-private field. It must match {@link #SECRET}, which the scan searches for, so
	 * every declared marker is covered.
	 */
	public void secret(String marker) {
		if (!SECRET.matcher(marker).matches()) {
			throw new IllegalArgumentException("A secret marker must match " + SECRET + ": " + marker);
		}
	}

	public Set<String> identifiersOfB() {
		return Set.copyOf(identifiersOfB);
	}

	/** Replaces each {@code {key}} of a sample path with A's resource of that key. */
	public String resolve(String path) {
		Matcher matcher = VARIABLE.matcher(path);
		StringBuilder resolved = new StringBuilder();
		while (matcher.find()) {
			String id = resourcesOfA.get(matcher.group(1));
			if (id == null) {
				throw new IllegalStateException("No resource of student A for {" + matcher.group(1) + "} in " + path
						+ ": add it with an IsolationWorldContributor");
			}
			matcher.appendReplacement(resolved, Matcher.quoteReplacement(id));
		}
		return matcher.appendTail(resolved).toString();
	}

}
