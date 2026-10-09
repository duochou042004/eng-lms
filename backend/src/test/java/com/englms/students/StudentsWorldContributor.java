package com.englms.students;

import java.util.UUID;

import com.englms.security.IsolationWorld;
import com.englms.security.IsolationWorld.Account;
import com.englms.security.IsolationWorldContributor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * The students part of the isolation world (T-M2.3 AC7): a student row for A, B, C ({@code ARCHIVED}, matching its
 * disabled account) and the must-change student, each with {@code SECRET-*} markers in the tutor-only fields (the
 * note, a contact-handle value), so every student endpoint is scanned for them. {@code {sid}} in a registry path is
 * A's student ID. Runs first, so later contributors find the rows.
 * <p>
 * T-M2.9 AC4: A, B and C also get a guardian and a stored learning profile with a {@code SECRET-*} marker in every
 * tutor-only text field whose format allows one (guardian name, relationship, email, notes; profile level, notes, a
 * strength, a weakness, a custom-field label and value). {@code {gid}} is A's guardian; B's guardian ID is B's. The
 * must-change student has neither (empty profile, {@code version} {@code null}).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class StudentsWorldContributor implements IsolationWorldContributor {

	private final JdbcTemplate jdbc;

	public StudentsWorldContributor(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	@Override
	public void contribute(IsolationWorld world) {
		UUID a = insert(world, world.studentA(), "A", "ACTIVE");
		UUID b = insert(world, world.studentB(), "B", "ACTIVE");
		UUID c = insert(world, world.studentC(), "C", "ARCHIVED");
		insert(world, world.mustChange(), "M", "ACTIVE");
		world.ownedByA("sid", a);
		world.ownedByB(b);
		world.ownedByA("gid", guardianAndProfile(world, a, "A"));
		world.ownedByB(guardianAndProfile(world, b, "B"));
		guardianAndProfile(world, c, "C");
	}

	/** @return the guardian's ID */
	private UUID guardianAndProfile(IsolationWorld world, UUID studentId, String tag) {
		UUID guardian = UUID.randomUUID();
		String name = secret(world, "SECRET-GUARDIAN-NAME-" + tag);
		String relationship = secret(world, "SECRET-GREL-" + tag);
		// The scan ignores case: the registered marker SECRET-G1-<tag> catches the email's local part.
		String email = secret(world, "SECRET-G1-" + tag).toLowerCase(java.util.Locale.ROOT) + "@example.test";
		String notes = secret(world, "SECRET-GUARDIAN-NOTES-" + tag);
		jdbc.update("""
				INSERT INTO student_guardian (id, student_id, name, relationship, email, notes, position, created_at,
				    updated_at)
				VALUES (?, ?, ?, ?, ?, ?, 1, now(), now())""", guardian, studentId, name, relationship, email, notes);
		jdbc.update("""
				INSERT INTO student_learning_profile (student_id, current_level, learning_notes, strengths, weaknesses,
				    custom_fields, created_at, updated_at)
				VALUES (?, ?, ?, ARRAY[?], ARRAY[?], CAST(? AS jsonb), now(), now())""", studentId,
				secret(world, "SECRET-LEVEL-" + tag), secret(world, "SECRET-PROFILE-NOTES-" + tag),
				secret(world, "SECRET-STRENGTH-" + tag), secret(world, "SECRET-WEAKNESS-" + tag),
				"[{\"label\":\"" + secret(world, "SECRET-CF-LABEL-" + tag) + "\",\"value\":\""
						+ secret(world, "SECRET-CF-VALUE-" + tag) + "\"}]");
		return guardian;
	}

	private static String secret(IsolationWorld world, String marker) {
		world.secret(marker);
		return marker;
	}

	private UUID insert(IsolationWorld world, Account account, String tag, String status) {
		UUID id = UUID.randomUUID();
		String note = "SECRET-STUDENT-NOTE-" + tag;
		String handle = "SECRET-STUDENT-HANDLE-" + tag;
		world.secret(note);
		world.secret(handle);
		jdbc.update("""
				INSERT INTO student (id, user_id, full_name, search_text, contact_handles, note, status, created_at,
				    updated_at)
				VALUES (?, ?, ?, ?, CAST(? AS jsonb), ?, ?, now(), now())""", id, account.id(), "Student " + tag,
				"student " + tag.toLowerCase(), "[{\"label\":\"Zalo\",\"value\":\"" + handle + "\"}]", note, status);
		return id;
	}

	@Override
	public void reset() {
		jdbc.update("DELETE FROM student_learning_profile");
		jdbc.update("DELETE FROM student_guardian");
		jdbc.update("DELETE FROM student");
	}

}
