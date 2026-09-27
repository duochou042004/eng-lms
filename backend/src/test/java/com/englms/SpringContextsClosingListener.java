package com.englms;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.junit.platform.launcher.TestPlan;

import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.test.context.TestContext;

/**
 * Closes the Spring test contexts as soon as the JUnit test plan has finished, before the JVM's shutdown hooks run
 * (T-M1.8 AC4, T-M1.4 QA F1).
 * <p>
 * Locally, Ryuk is off under rootless Podman (DEC-044), so Testcontainers stops its containers from its own JVM
 * shutdown hook. Spring's shutdown hook closed the cached test contexts at the same time, and Spring Modulith's event
 * publication registry queries the database while closing. With the database container already gone, that query
 * waited for Hikari's 30 s connection timeout, and Surefire killed the fork JVM. Closing the contexts here, while the
 * database still runs, lets Spring shut down in dependency order: the registry, then the data source, then the
 * {@code PostgreSQLContainer} bean. The context cache is untouched while tests run, so caching still works.
 * <p>
 * Registered twice: as a Spring {@code TestExecutionListener} ({@code META-INF/spring.factories}), which records each
 * loaded context after its test class, and as a JUnit {@code TestExecutionListener}
 * ({@code META-INF/services/org.junit.platform.launcher.TestExecutionListener}), which closes them at the end.
 */
public class SpringContextsClosingListener implements org.springframework.test.context.TestExecutionListener,
		org.junit.platform.launcher.TestExecutionListener {

	private static final Set<ConfigurableApplicationContext> CONTEXTS = ConcurrentHashMap.newKeySet();

	@Override
	public void afterTestClass(TestContext testContext) {
		if (testContext.hasApplicationContext()) {
			ApplicationContext context = testContext.getApplicationContext();
			if (context instanceof ConfigurableApplicationContext configurable) {
				CONTEXTS.add(configurable);
			}
		}
	}

	@Override
	public void testPlanExecutionFinished(TestPlan testPlan) {
		CONTEXTS.forEach(ConfigurableApplicationContext::close);
		CONTEXTS.clear();
	}

}
