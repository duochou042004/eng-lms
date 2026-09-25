package com.englms.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import com.englms.TestcontainersConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * AC6: Flyway V1 applies on PostgreSQL 18 and the context starts with {@code ddl-auto=validate}.
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
		assertThat(jdbc.queryForList("SELECT version FROM app.flyway_schema_history WHERE success AND version IS NOT NULL", String.class))
			.containsExactly("202609250001");
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
	void createsOnlyPlatformTables() {
		assertThat(jdbc.queryForList(
				"SELECT table_name FROM information_schema.tables WHERE table_schema = 'app' ORDER BY table_name",
				String.class))
			.as("V1 has no domain or session tables (data-model.md §4, DEC-036)")
			.containsExactly("event_publication", "flyway_schema_history");
	}

}
