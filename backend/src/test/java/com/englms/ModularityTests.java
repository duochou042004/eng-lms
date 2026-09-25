package com.englms;

import org.junit.jupiter.api.Test;

import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.docs.Documenter;

class ModularityTests {

	static final ApplicationModules MODULES = ApplicationModules.of(EnglmsApplication.class);

	@Test
	void verifiesModuleBoundaries() {
		MODULES.verify();
	}

	@Test
	void writesModuleDocumentation() {
		new Documenter(MODULES, Documenter.Options.defaults().withOutputFolder("target/modulith-docs"))
			.writeDocumentation();
	}

}
