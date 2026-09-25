package com.englms.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noMethods;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_USE_FIELD_INJECTION;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;

import com.tngtech.archunit.core.domain.Dependency;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RestController;

/**
 * Base architecture rules (test-strategy.md §4, rules 1, 2 and 5) plus "time comes from the Clock bean".
 * Rule 6 (forbidden identifiers) is {@link ForbiddenIdentifiersTest}; rules 3, 4, 7 and 8 arrive with their modules.
 */
@AnalyzeClasses(packages = "com.englms", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureRulesTest {

	private static final String ROOT = "com.englms.";

	/** Rule 1. */
	@ArchTest
	static final ArchRule controllersDoNotAccessPersistence = noClasses().that()
		.resideInAPackage("..internal.web..")
		.should()
		.dependOnClassesThat()
		.resideInAPackage("..internal.persistence..");

	/** Rule 2 (also enforced by Spring Modulith). */
	@ArchTest
	static final ArchRule noAccessToAnotherModulesInternals = noClasses().should(accessAnotherModulesInternals());

	/** Rule 5a (class level). */
	@ArchTest
	static final ArchRule noTransactionalControllerClasses = noClasses().that()
		.areAnnotatedWith(RestController.class)
		.should()
		.beAnnotatedWith(Transactional.class);

	/** Rule 5a (handler level). */
	@ArchTest
	static final ArchRule noTransactionalHandlers = noMethods().that()
		.areDeclaredInClassesThat()
		.areAnnotatedWith(RestController.class)
		.should()
		.beAnnotatedWith(Transactional.class);

	/** Rule 5b. */
	@ArchTest
	static final ArchRule noFieldInjection = NO_CLASSES_SHOULD_USE_FIELD_INJECTION;

	/** Time is read from the injected {@code Clock}, so tests can control it. */
	@ArchTest
	static final ArchRule noSystemClockReads = noClasses().should()
		.callMethod(Instant.class, "now")
		.orShould()
		.callMethod(LocalDate.class, "now")
		.orShould()
		.callMethod(LocalDateTime.class, "now")
		.orShould()
		.callMethod(OffsetDateTime.class, "now")
		.orShould()
		.callMethod(ZonedDateTime.class, "now")
		.because("time must come from the Clock bean (com.englms.shared.SharedConfiguration)");

	static String moduleOf(JavaClass javaClass) {
		String name = javaClass.getPackageName();
		if (!name.startsWith(ROOT)) {
			return null;
		}
		String rest = name.substring(ROOT.length());
		int dot = rest.indexOf('.');
		return (dot < 0) ? rest : rest.substring(0, dot);
	}

	static ArchCondition<JavaClass> accessAnotherModulesInternals() {
		return new ArchCondition<>("access another module's internal package") {
			@Override
			public void check(JavaClass origin, ConditionEvents events) {
				String originModule = moduleOf(origin);
				for (Dependency dependency : origin.getDirectDependenciesFromSelf()) {
					JavaClass target = dependency.getTargetClass();
					String targetModule = moduleOf(target);
					boolean internal = target.getPackageName().contains(".internal");
					if (targetModule != null && internal && !targetModule.equals(originModule)) {
						events.add(SimpleConditionEvent.satisfied(origin, dependency.getDescription()));
					}
				}
			}
		};
	}

}
