package com.englms.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;

import com.zaxxer.hikari.HikariDataSource;
import org.flywaydb.core.Flyway;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import com.englms.TestcontainersConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * AC6: Flyway V1 applies on PostgreSQL 18 and the context starts with {@code ddl-auto=validate}. T-M2.1: the
 * identity and audit migrations apply on an empty database (this context) and on top of the M1 schema
 * ({@link #upgradesTheM1SchemaToTheLatestVersion}); the database enforces the single tutor (I-01) and append-only audit.
 * T-M2.3: the student table and its constraints.
 */
@Tag("container")
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class FlywayMigrationTest {

	@Autowired
	JdbcTemplate jdbc;

	@Test
	void runsOnPostgres18() {
		assertThat(jdbc.queryForObject("SHOW server_version_num", Integer.class)).isBetween(180000, 189999);
	}

	@Test
	void appliesV1Successfully() {
		assertThat(jdbc.queryForList("""
				SELECT version FROM app.flyway_schema_history WHERE success AND version IS NOT NULL ORDER BY installed_rank""",
				String.class))
			.containsExactly("202609250001", "202610040001", "202610040002", "202610070001");
	}

	@Test
	void installsTheExtensionsInTheAppSchema() {
		assertThat(jdbc.queryForList("""
				SELECT e.extname FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
				WHERE n.nspname = 'app' ORDER BY e.extname""", String.class)).containsExactly("pg_trgm", "unaccent");
	}

	@Test
	void textSearchConfigurationIgnoresAccents() {
		assertThat(jdbc.queryForObject("SELECT to_tsvector('app.simple_unaccent', 'Tiếng Việt Đà Nẵng')::text",
				String.class))
			.isEqualTo("'da':3 'nang':4 'tieng':1 'viet':2");
	}

	@Test
	void trigramSimilarityIsAvailable() {
		assertThat(jdbc.queryForObject("SELECT app.similarity('grammar', 'grammer') > 0.3", Boolean.class)).isTrue();
	}

	@Test
	void createsOnlyTheDocumentedTables() {
		assertThat(jdbc.queryForList(
				"SELECT table_name FROM information_schema.tables WHERE table_schema = 'app' ORDER BY table_name",
				String.class))
			.as("V1: platform tables only; T-M2.1: identity, Spring Session, remember-me and audit (data-model.md §4, DEC-036); "
					+ "T-M2.3: student")
			.containsExactly("audit_event", "event_publication", "flyway_schema_history", "persistent_logins",
					"spring_session", "spring_session_attributes", "student", "user_account");
	}

	@Test
	void theDatabaseRejectsASecondTutor() {
		try {
			insertAccount("tutor.one", "TUTOR");
			assertThatThrownBy(() -> insertAccount("tutor.two", "TUTOR")).isInstanceOf(DataIntegrityViolationException.class)
				.hasMessageContaining("ux_user_account__single_tutor");
			insertAccount("student.one", "STUDENT");
			insertAccount("student.two", "STUDENT");
		}
		finally {
			jdbc.update("DELETE FROM app.user_account");
		}
	}

	@Test
	void auditEventsAreAppendOnly() {
		UUID id = UUID.randomUUID();
		jdbc.update("INSERT INTO app.audit_event (id, occurred_at, action) VALUES (?, now(), 'LOGIN_FAILED')", id);
		try {
			assertThatThrownBy(() -> jdbc.update("UPDATE app.audit_event SET action = 'X' WHERE id = ?", id))
				.hasMessageContaining("audit_event is append-only");
		}
		finally {
			assertThat(jdbc.update("DELETE FROM app.audit_event WHERE id = ?", id)).isOne();
		}
	}

	@Test
	void upgradesTheM1SchemaToTheLatestVersion() {
		jdbc.execute("DROP DATABASE IF EXISTS m1_upgrade");
		jdbc.execute("CREATE DATABASE m1_upgrade");
		HikariDataSource dataSource = (HikariDataSource) jdbc.getDataSource();
		String jdbcUrl = dataSource.getJdbcUrl().replaceFirst("/[^/?]+(\\?|$)", "/m1_upgrade$1");
		String user = dataSource.getUsername();
		String password = dataSource.getPassword();

		Flyway m1 = Flyway.configure().dataSource(jdbcUrl, user, password).schemas("app").defaultSchema("app")
			.target("202609250001").load();
		assertThat(m1.migrate().migrationsExecuted).isOne();
		Flyway latest = Flyway.configure().dataSource(jdbcUrl, user, password).schemas("app").defaultSchema("app").load();

		assertThat(latest.migrate().migrationsExecuted).isEqualTo(3);
		assertThat(latest.info().current().getVersion().getVersion()).isEqualTo("202610070001");
	}

	/** T-M2.3: one student per account, a known status, and an account with a student cannot be deleted. */
	@Test
	void theStudentTableEnforcesItsConstraints() {
		UUID account = insertAccount("student.c", "STUDENT");
		try {
			insertStudent(account, "ACTIVE");
			assertThatThrownBy(() -> insertStudent(account, "ACTIVE")).isInstanceOf(DataIntegrityViolationException.class)
				.hasMessageContaining("ux_student__user_id");
			assertThatThrownBy(() -> insertStudent(insertAccount("student.d", "STUDENT"), "DELETED"))
				.isInstanceOf(DataIntegrityViolationException.class)
				.hasMessageContaining("ck_student__status");
			assertThatThrownBy(() -> jdbc.update("DELETE FROM app.user_account WHERE id = ?", account))
				.isInstanceOf(DataIntegrityViolationException.class)
				.hasMessageContaining("fk_student__user_id");
			assertThat(jdbc.queryForObject("SELECT indexdef FROM pg_indexes WHERE indexname = 'ix_student__search_text'",
					String.class)).contains("gin", "gin_trgm_ops");
		}
		finally {
			jdbc.update("DELETE FROM app.student");
			jdbc.update("DELETE FROM app.user_account");
		}
	}

	private void insertStudent(UUID userId, String status) {
		jdbc.update("""
				INSERT INTO app.student (id, user_id, full_name, search_text, status, created_at, updated_at)
				VALUES (?, ?, 'S', 's', ?, now(), now())""", UUID.randomUUID(), userId, status);
	}

	private UUID insertAccount(String username, String role) {
		UUID id = UUID.randomUUID();
		jdbc.update("""
				INSERT INTO app.user_account (id, username, username_normalized, password_hash, role, status, created_at, updated_at)
				VALUES (?, ?, ?, '{bcrypt}x', ?, 'ACTIVE', now(), now())""", id, username, username, role);
		return id;
	}

}
