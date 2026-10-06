package com.englms.architecture;

import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.simpleNameStartingWith;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.type;
import static com.tngtech.archunit.core.domain.properties.CanBeAnnotated.Predicates.annotatedWith;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.methods;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Parameter;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import com.englms.shared.web.TutorPrivate;
import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * Test-strategy §4 rules 3 and 4 (ADR-0016 §2, §4), checked on {@code com.englms} and proven against the violating
 * classes in {@code fixture.archunit}. Plain JUnit tests (not {@code @ArchTest}) so that {@code @Tag("security")}
 * selects them with {@code -Dgroups=security}.
 */
@Tag("security")
class StudentIsolationRulesTest {

	static final String STUDENT_WEB = "..web.student..";

	static final JavaClasses APPLICATION = new ClassFileImporter().withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
		.importPackages("com.englms");

	static final JavaClasses FIXTURES = new ClassFileImporter().importPackages("fixture.archunit");

	/**
	 * Rule 3: no {@code ..web.student..} handler takes a student ID: neither the Java parameter name nor a
	 * {@code @PathVariable}/{@code @RequestParam} name is {@code studentId} or ends in {@code StudentId}
	 * (case, {@code _} and {@code -} ignored). ArchUnit has no parameter names, so they come from reflection; the
	 * Boot parent compiles with {@code -parameters}.
	 */
	static final ArchRule NO_STUDENT_ID_PARAMETER = methods().that()
		.areDeclaredInClassesThat()
		.resideInAPackage(STUDENT_WEB)
		.and()
		.areMetaAnnotatedWith(RequestMapping.class)
		.should(notTakeAStudentId())
		.allowEmptyShould(true);

	/** A type holding private tutor data in a field, inherited ones included (T-M2.2 SEC S3-4). */
	static final DescribedPredicate<JavaClass> HAVE_A_TUTOR_PRIVATE_FIELD = DescribedPredicate.describe(
			"have a @TutorPrivate field",
			javaClass -> javaClass.getAllFields().stream().anyMatch(field -> field.isAnnotatedWith(TutorPrivate.class)));

	/** Rule 4 for every {@code ..web.student..} class; {@code root} is {@code com.englms} (fixtures: their own root). */
	static ArchRule noTutorPrivateDependency(String root) {
		return noClasses().that()
			.resideInAPackage(STUDENT_WEB)
			.should()
			.dependOnClassesThat(resideInAPackage(root + ".notes..")
				.or(simpleNameStartingWith("LearningProfile"))
				.or(annotatedWith(TutorPrivate.class))
				.or(HAVE_A_TUTOR_PRIVATE_FIELD)
				.or(type(TutorPrivate.class))
				.as("are in " + root + ".notes.., are LearningProfile*, are (or use) @TutorPrivate or have a @TutorPrivate field"))
			.allowEmptyShould(true);
	}

	@Test
	void studentRulesHoldForTheApplication() {
		NO_STUDENT_ID_PARAMETER.check(APPLICATION);
		noTutorPrivateDependency("com.englms").check(APPLICATION);
	}

	@Test
	void ruleThreeCatchesEveryWayOfNamingAStudentId() {
		List<String> report = NO_STUDENT_ID_PARAMETER.evaluate(FIXTURES).getFailureReport().getDetails();

		assertThat(report).anySatisfy(line -> assertThat(line).contains("$ParameterNamedStudentId.get", "'studentId'"))
			.anySatisfy(line -> assertThat(line).contains("$ParameterEndingInStudentId.get", "'peerStudentId'"))
			.anySatisfy(line -> assertThat(line).contains("$PathVariableNamedStudentId.get", "'studentId'"))
			.anySatisfy(line -> assertThat(line).contains("$RequestParamEndingInStudentId.get", "'otherStudentId'"))
			.noneSatisfy(line -> assertThat(line).contains("$Clean"))
			.hasSize(4);
	}

	@Test
	void ruleFourCatchesNotesLearningProfileAndTutorPrivateTypes() {
		List<String> report = noTutorPrivateDependency("fixture.archunit").evaluate(FIXTURES)
			.getFailureReport()
			.getDetails();

		assertThat(report).anySatisfy(line -> assertThat(line).contains("$DependsOnNotes", "FixtureNote"))
			.anySatisfy(line -> assertThat(line).contains("$DependsOnLearningProfile", "LearningProfileSummary"))
			.anySatisfy(line -> assertThat(line).contains("$DependsOnTutorPrivateType", "PrivateRemark"))
			.anySatisfy(line -> assertThat(line).contains("$HoldsTutorPrivateField", "TutorPrivate"))
			.anySatisfy(line -> assertThat(line).contains("$DependsOnTypeWithTutorPrivateField", "LessonView"))
			.noneSatisfy(line -> assertThat(line).contains("$Clean"));
	}

	static ArchCondition<JavaMethod> notTakeAStudentId() {
		return new ArchCondition<>("not take a student ID (parameter, @PathVariable or @RequestParam name)") {
			@Override
			public void check(JavaMethod method, ConditionEvents events) {
				for (Parameter parameter : method.reflect().getParameters()) {
					if (!parameter.isNamePresent()) {
						events.add(SimpleConditionEvent.violated(method,
								method.getFullName() + " has no parameter names (compile with -parameters)"));
					}
					PathVariable path = parameter.getAnnotation(PathVariable.class);
					RequestParam param = parameter.getAnnotation(RequestParam.class);
					Stream.of(parameter.getName(), (path != null) ? path.value() : "", (path != null) ? path.name() : "",
							(param != null) ? param.value() : "", (param != null) ? param.name() : "")
						.filter(StudentIsolationRulesTest::isStudentId)
						.distinct()
						.forEach(name -> events.add(SimpleConditionEvent.violated(method,
								method.getFullName() + " takes a student ID: '" + name + "'")));
				}
			}
		};
	}

	static boolean isStudentId(String name) {
		return name.replace("_", "").replace("-", "").toLowerCase(Locale.ROOT).endsWith("studentid");
	}

}
