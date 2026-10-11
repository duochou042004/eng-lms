package com.englms;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * PostgreSQL 18 for integration tests. Tests using it are tagged {@code container}: they need a Docker-compatible
 * engine, Docker or Podman ({@code source scripts/env.sh} locally, development-setup §3; CI uses the runner's Docker).
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
	 * Up to three start attempts: an engine's API service can close idle connections (e.g. rootless Podman's
	 * socket-activated {@code podman system service} exits after 5 s without requests), so the first API call after a
	 * long-running test class can hit a pooled connection that is already closed ("Broken pipe"). A new attempt opens
	 * a new connection (T-M2.1). Harmless on Docker.
	 */
	public static PostgreSQLContainer newPostgres() {
		PostgreSQLContainer container = new PostgreSQLContainer(
				DockerImageName.parse(POSTGRES_IMAGE).asCompatibleSubstituteFor("postgres"));
		container.withStartupAttempts(3);
		return container;
	}

}
