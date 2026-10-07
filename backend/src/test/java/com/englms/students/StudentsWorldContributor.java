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
		insert(world, world.studentC(), "C", "ARCHIVED");
		insert(world, world.mustChange(), "M", "ACTIVE");
		world.ownedByA("sid", a);
		world.ownedByB(b);
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
		jdbc.update("DELETE FROM student");
	}

}
