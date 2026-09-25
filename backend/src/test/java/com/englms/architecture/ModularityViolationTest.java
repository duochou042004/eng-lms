package com.englms.architecture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import com.tngtech.archunit.core.importer.ImportOption;

import fixture.modulith.illegal.IllegalFixtureApplication;
import fixture.modulith.legal.LegalFixtureApplication;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.core.Violations;

/**
 * AC3: {@code ApplicationModules.verify()} rejects an illegal cross-module dependency. The fixtures live outside
 * {@code com.englms} so they never become modules of the real application.
 */
class ModularityViolationTest {

	/** The fixtures are test classes, which Spring Modulith ignores by default. */
	static final ImportOption INCLUDE_TEST_CLASSES = location -> true;

	@Test
	void rejectsAccessToAnotherModulesInternalPackage() {
		ApplicationModules modules = ApplicationModules.of(IllegalFixtureApplication.class, INCLUDE_TEST_CLASSES);

		assertThatThrownBy(modules::verify).isInstanceOf(Violations.class)
			.hasMessageContaining("fixture.modulith.illegal.beta.internal.BetaInternal");
	}

	@Test
	void acceptsTheSameDependencyThroughThePublicApi() {
		ApplicationModules modules = ApplicationModules.of(LegalFixtureApplication.class, INCLUDE_TEST_CLASSES);

		assertThat(modules.detectViolations().hasViolations()).isFalse();
	}

}
