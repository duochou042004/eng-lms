package com.englms.identity;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Test accounts inserted straight into {@code user_account} (there is no students module yet, T-M2.1 design notes)
 * and the clean-up between tests. Hashes are real {@code {bcrypt}} strength-12 hashes, cached per password.
 */
public final class IdentityFixtures {

	public static final String PASSWORD = "correct-horse-battery";

	private static final BCryptPasswordEncoder BCRYPT = new BCryptPasswordEncoder(12);

	private static final Map<String, String> HASHES = new ConcurrentHashMap<>();

	private IdentityFixtures() {
	}

	/** Deletes every account, session, remember-me token and audit event. */
	public static void reset(JdbcTemplate jdbc) {
		jdbc.update("DELETE FROM spring_session");
		jdbc.update("DELETE FROM persistent_logins");
		jdbc.update("DELETE FROM user_account");
		jdbc.update("DELETE FROM audit_event");
	}

	public static UUID insert(JdbcTemplate jdbc, String username, String password, Role role, boolean mustChange) {
		UUID id = UUID.randomUUID();
		jdbc.update("""
				INSERT INTO user_account (id, username, username_normalized, password_hash, role, status,
				    must_change_password, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, now(), now())""", id, username, Usernames.normalize(username),
				hash(password), role.name(), mustChange);
		return id;
	}

	public static String hash(String password) {
		return HASHES.computeIfAbsent(password, raw -> "{bcrypt}" + BCRYPT.encode(raw));
	}

}
