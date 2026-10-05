package com.englms;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * PostgreSQL 18 for integration tests. Tests using it are tagged {@code container}: they need a Docker-compatible
 * socket (CI; locally once T-M1.4 enables the rootless Podman socket).
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

	public static final String POSTGRES_IMAGE = "docker.io/library/postgres:18";

	@Bean
	@ServiceConnection
	PostgreSQLContainer postgresContainer() {
		return newPostgres();
	}

	/**
	 * Up to three start attempts: the rootless Podman API service ({@code podman system service}, socket-activated)
	 * exits after 5 s without requests, so the first Docker API call after a long-running test class can hit a
	 * pooled connection that Podman has closed ("Broken pipe"). A new attempt opens a new connection (T-M2.1: the
	 * suite now has enough long-running classes between container starts to meet this).
	 */
	public static PostgreSQLContainer newPostgres() {
		PostgreSQLContainer container = new PostgreSQLContainer(
				DockerImageName.parse(POSTGRES_IMAGE).asCompatibleSubstituteFor("postgres"));
		container.withStartupAttempts(3);
		return container;
	}

}
