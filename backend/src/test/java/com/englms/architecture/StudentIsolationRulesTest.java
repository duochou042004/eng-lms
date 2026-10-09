package com.englms.architecture;

import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.simpleNameStartingWith;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.type;
import static com.tngtech.archunit.core.domain.properties.CanBeAnnotated.Predicates.annotatedWith;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.methods;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThat;

import java.lang.annotation.Annotation;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.lang.reflect.Parameter;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;
import java.util.stream.Stream;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import com.englms.shared.web.CurrentStudent;
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

import org.springframework.core.MethodParameter;
import org.springframework.core.ResolvableType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.MatrixVariable;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.SessionAttribute;

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
	 * Rule 3: no {@code ..web.student..} handler takes a student ID. Checked names (case, {@code _} and {@code -}
	 * ignored; {@code studentId}, ending in {@code StudentId}, or exactly {@code sid}): the Java parameter name; the
	 * {@code @PathVariable}, {@code @RequestParam}, {@code @RequestHeader}, {@code @CookieValue} and
	 * {@code @MatrixVariable} names; and for every other parameter (a body, a part, an explicit or implicit model
	 * attribute, with or without {@code @Valid}; not one bound by name, a request/session attribute or
	 * {@code @AuthenticationPrincipal}) the field and record-component names of its type with their {@code @JsonProperty}
	 * and {@code @JsonAlias} names, recursing into nested {@code com.englms} and {@code fixture} types (through arrays,
	 * {@code Collection} and {@code Optional} elements, {@code Map} values and resolved type arguments), cycle-safe
	 * (T-M2.9, DEC-097 (4) (a), SEC round 1).
	 * {@code CurrentStudent} is exempt: its {@code studentId} comes from the session (the L2 verifier refuses a binding
	 * annotation on it). Catch-all binders ({@code Map}, {@code HttpServletRequest}, …) are out of reach of a name check
	 * (DEC-096); the {@code SECRET-*}/B-ID scan and the SEC review are their backstop. ArchUnit has no parameter names,
	 * so they come from reflection; the Boot parent compiles with {@code -parameters}.
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
			// T-M2.9 AC5 (DEC-097 (4) (a)): one fixture per way, each report naming the field path.
			.anySatisfy(line -> assertThat(line).contains("$HeaderNamedStudentId.get", "'X-Student-Id'"))
			.anySatisfy(line -> assertThat(line).contains("$CookieEndingInStudentId.get", "'lastStudentId'"))
			.anySatisfy(line -> assertThat(line).contains("$MatrixVariableNamedStudentId.get", "'student_id'"))
			.anySatisfy(line -> assertThat(line).contains("$BodyRecordComponent.post", "'body.studentId'"))
			.anySatisfy(line -> assertThat(line).contains("$NestedBodyField.post", "'body.inner.peerStudentId'"))
			.anySatisfy(line -> assertThat(line).contains("$BodyFieldInsideAList.post", "'body.entries[].studentId'"))
			.anySatisfy(line -> assertThat(line).contains("$JsonPropertyRename.post", "'body.peer' (JSON name 'studentId')"))
			.anySatisfy(line -> assertThat(line).contains("$JsonAliasRename.post", "'body.peer' (JSON name 'student_id')"))
			.anySatisfy(line -> assertThat(line).contains("$RequestPartField.post", "'meta.studentId'"))
			.anySatisfy(line -> assertThat(line).contains("$ModelAttributeField.get", "'filter.studentId'"))
			.anySatisfy(line -> assertThat(line).contains("$UnannotatedModelAttributeField.get", "'query.studentId'"))
			.anySatisfy(line -> assertThat(line).contains("$ArrayOfBodies.post", "'entries[].studentId'"))
			.anySatisfy(line -> assertThat(line).contains("$OptionalBodyField.post", "'body.entry.studentId'"))
			.anySatisfy(line -> assertThat(line).contains("$MapValueBodyField.post", "'body.byKey{}.studentId'"))
			// T-M2.9 SEC round 1: @Valid/@Validated model attributes (S3-1), sid (S3-2), generic wrappers (S4-3 (a)).
			.anySatisfy(line -> assertThat(line).contains("$ValidModelAttributeField.get", "'filter.studentId'"))
			.anySatisfy(line -> assertThat(line).contains("$ValidatedModelAttributeField.get", "'filter.studentId'"))
			.anySatisfy(line -> assertThat(line).contains("$PathVariableNamedSid.get", "'sid'"))
			.anySatisfy(line -> assertThat(line).contains("$GenericWrapperBody.post", "'body.payload.studentId'"))
			.noneSatisfy(line -> assertThat(line).contains("$Clean"))
			.hasSize(22);
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
		return new ArchCondition<>("not take a student ID (parameter, path variable, request parameter, header, cookie "
				+ "or matrix variable name, or a field of a bound body, part or model attribute)") {
			@Override
			public void check(JavaMethod method, ConditionEvents events) {
				for (Parameter parameter : method.reflect().getParameters()) {
					if (!parameter.isNamePresent()) {
						events.add(SimpleConditionEvent.violated(method,
								method.getFullName() + " has no parameter names (compile with -parameters)"));
					}
					Stream.concat(Stream.of(parameter.getName()), bindingNames(parameter))
						.filter(StudentIsolationRulesTest::isStudentId)
						.distinct()
						.forEach(name -> events.add(SimpleConditionEvent.violated(method,
								method.getFullName() + " takes a student ID: '" + name + "'")));
					if (bindsFields(parameter)) {
						studentIdFields(parameter, path -> events.add(SimpleConditionEvent.violated(method,
								method.getFullName() + " takes a student ID in a field: " + path)));
					}
				}
			}
		};
	}

	/** The request names a parameter is bound from: path variable, request parameter, header, cookie, matrix variable. */
	static Stream<String> bindingNames(Parameter parameter) {
		PathVariable path = parameter.getAnnotation(PathVariable.class);
		RequestParam param = parameter.getAnnotation(RequestParam.class);
		RequestHeader header = parameter.getAnnotation(RequestHeader.class);
		CookieValue cookie = parameter.getAnnotation(CookieValue.class);
		MatrixVariable matrix = parameter.getAnnotation(MatrixVariable.class);
		return Stream.of((path != null) ? Stream.of(path.value(), path.name()) : Stream.<String>empty(),
				(param != null) ? Stream.of(param.value(), param.name()) : Stream.<String>empty(),
				(header != null) ? Stream.of(header.value(), header.name()) : Stream.<String>empty(),
				(cookie != null) ? Stream.of(cookie.value(), cookie.name()) : Stream.<String>empty(),
				(matrix != null) ? Stream.of(matrix.value(), matrix.name()) : Stream.<String>empty())
			.flatMap(names -> names);
	}

	/** Annotations whose parameter is bound by name or resolved from the request context, not from fields. */
	static final List<Class<? extends Annotation>> NOT_FIELD_BOUND = List.of(PathVariable.class, RequestParam.class,
			RequestHeader.class, CookieValue.class, MatrixVariable.class, RequestAttribute.class, SessionAttribute.class,
			AuthenticationPrincipal.class);

	/**
	 * Any parameter bound from fields: a body, a part, an explicit or implicit model attribute, also with {@code @Valid}
	 * or {@code @Validated} (T-M2.9 SEC S3-1); never {@code CurrentStudent}. Simple types have no application fields.
	 */
	static boolean bindsFields(Parameter parameter) {
		return parameter.getType() != CurrentStudent.class
				&& NOT_FIELD_BOUND.stream().noneMatch(parameter::isAnnotationPresent);
	}

	static void studentIdFields(Parameter parameter, Consumer<String> violation) {
		studentIdFields(ResolvableType.forMethodParameter(MethodParameter.forParameter(parameter)), parameter.getName(),
				new HashSet<>(), violation);
	}

	/**
	 * Reports the path of each field of {@code type} (and of the {@code com.englms}/{@code fixture} types it reaches)
	 * whose name, {@code @JsonProperty} or {@code @JsonAlias} name is a student ID. Type arguments are resolved, so the
	 * fields of {@code Wrapper<Filter>}'s {@code T} are those of {@code Filter} (SEC S4-3 (a)). {@code seen} (resolved
	 * types) stops cycles.
	 */
	static void studentIdFields(ResolvableType type, String path, Set<String> seen, Consumer<String> violation) {
		Class<?> raw = type.resolve();
		if (raw == null) {
			return;
		}
		if (type.isArray()) {
			studentIdFields(type.getComponentType(), path + "[]", seen, violation);
			return;
		}
		if (Collection.class.isAssignableFrom(raw)) {
			studentIdFields(type.asCollection().getGeneric(0), path + "[]", seen, violation);
			return;
		}
		if (raw == Optional.class) {
			studentIdFields(type.getGeneric(0), path, seen, violation);
			return;
		}
		if (Map.class.isAssignableFrom(raw)) {
			studentIdFields(type.asMap().getGeneric(1), path + "{}", seen, violation);
			return;
		}
		if (!isApplicationType(raw) || raw == CurrentStudent.class || !seen.add(type.toString())) {
			return;
		}
		for (ResolvableType declaring = type; declaring.resolve() != null && isApplicationType(declaring.resolve());
				declaring = declaring.getSuperType()) {
			for (Field field : declaring.resolve().getDeclaredFields()) {
				if (Modifier.isStatic(field.getModifiers()) || field.isSynthetic()) {
					continue;
				}
				String fieldPath = path + "." + field.getName();
				JsonProperty property = field.getAnnotation(JsonProperty.class);
				JsonAlias alias = field.getAnnotation(JsonAlias.class);
				Stream.concat(Stream.of(field.getName(), (property != null) ? property.value() : ""),
						(alias != null) ? Arrays.stream(alias.value()) : Stream.empty())
					.filter(StudentIsolationRulesTest::isStudentId)
					.distinct()
					.forEach(name -> violation.accept("'" + fieldPath + "'"
							+ (name.equals(field.getName()) ? "" : " (JSON name '" + name + "')")));
				studentIdFields(ResolvableType.forField(field, declaring), fieldPath, seen, violation);
			}
		}
	}

	static boolean isApplicationType(Class<?> type) {
		return type.getName().startsWith("com.englms.") || type.getName().startsWith("fixture.");
	}

	/** {@code studentId}, a name ending in {@code StudentId}, or {@code sid} (the codebase's short name; SEC S3-2). */
	static boolean isStudentId(String name) {
		String normalized = name.replace("_", "").replace("-", "").toLowerCase(Locale.ROOT);
		return normalized.endsWith("studentid") || normalized.equals("sid");
	}

}
