package com.englms.shared.web;

import static com.englms.shared.web.Audience.Kind.AUTHENTICATED;
import static com.englms.shared.web.Audience.Kind.PUBLIC;
import static com.englms.shared.web.Audience.Kind.STUDENT;
import static com.englms.shared.web.Audience.Kind.TUTOR;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.List;
import java.util.stream.Stream;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import fixture.verifier.CatchAllHandler;
import fixture.verifier.web.student.StudentWebHandlers;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.HttpRequestHandler;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.RouterFunctions;
import org.springframework.web.servlet.function.ServerResponse;
import org.springframework.web.servlet.handler.SimpleUrlHandlerMapping;
import org.springframework.web.servlet.mvc.ParameterizableViewController;
import org.springframework.web.util.pattern.PathPatternParser;

/**
 * T-M2.2 AC2: each L2 rule refuses the start of a servlet context holding one test-only controller, naming the
 * handler; valid handlers start; a context without a web application (the operator CLI) does not run the check.
 */
@Tag("security")
class AudienceVerifierTest {

	final WebApplicationContextRunner web = new WebApplicationContextRunner()
		.withUserConfiguration(Mvc.class, AudienceVerifier.class);

	static Stream<Arguments> brokenRules() {
		return Stream.of(Arguments.of(NoAudience.class, "no @Audience"),
				Arguments.of(StudentOnTutor.class, "STUDENT on /api/v1/tutor/**"),
				Arguments.of(AuthenticatedOnTutor.class, "AUTHENTICATED on /api/v1/tutor/**"),
				Arguments.of(TutorOnStudent.class, "TUTOR on /api/v1/student/**"),
				Arguments.of(AuthenticatedOnStudent.class, "AUTHENTICATED on /api/v1/student/**"),
				Arguments.of(TutorOnAuth.class, "TUTOR on /api/v1/auth/**"),
				Arguments.of(StudentOnAuth.class, "STUDENT on /api/v1/auth/**"),
				Arguments.of(AuthenticatedOnMeta.class, "AUTHENTICATED on /api/v1/meta"),
				Arguments.of(PostPublicOnMeta.class, "PUBLIC on [POST] /api/v1/meta"),
				Arguments.of(PublicOnStudent.class, "PUBLIC on /api/v1/student/**"),
				Arguments.of(PublicOnTutor.class, "PUBLIC on /api/v1/tutor/**"),
				Arguments.of(UnknownApiPrefix.class, "/api/v1/probe: unknown /api/** prefix"),
				Arguments.of(DotSegments.class, "/api/v1/tutor/{x}/../../student/probe: ambiguous path pattern"),
				Arguments.of(EmptySegment.class, "/api/v1/tutor//probe: ambiguous path pattern"),
				Arguments.of(OutsideApi.class, "/probe: a com.englms handler outside /api/**"),
				Arguments.of(NoHttpMethod.class, "no explicit HTTP method"),
				Arguments.of(MultiPattern.class, "/api/v1/student/probe: TUTOR on /api/v1/student/**"),
				Arguments.of(ClassLevelWrong.class, "STUDENT on /api/v1/tutor/**"),
				// SEC round 1
				Arguments.of(StudentOutsideStudentWeb.class, "a STUDENT handler outside a ..web.student.. package"),
				Arguments.of(StudentWebHandlers.TutorInStudentWeb.class, "TUTOR on a ..web.student.. handler"),
				Arguments.of(StudentWebHandlers.StudentIdVariable.class, "a student ID path variable {peer_StudentId}"),
				Arguments.of(CatchAllHandler.class, "/{*rest}: the first segment is not a literal"),
				Arguments.of(WildcardFirstSegment.class, "/*/v1/tutor/probe: the first segment is not a literal"));
	}

	@ParameterizedTest(name = "{0}")
	@MethodSource("brokenRules")
	void refusesToStartNamingTheHandler(Class<?> controller, String violation) {
		web.withUserConfiguration(controller).run(context -> {
			assertThat(context).hasFailed();
			assertThat(NestedExceptionUtils.getMostSpecificCause(context.getStartupFailure()))
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("@Audience check failed")
				.hasMessageContaining(controller.getName() + "#probe")
				.hasMessageContaining(violation);
		});
	}

	@Test
	void namesEveryOffendingHandler() {
		web.withUserConfiguration(NoAudience.class, TutorOnStudent.class).run(context -> {
			assertThat(NestedExceptionUtils.getMostSpecificCause(context.getStartupFailure()))
				.hasMessageContaining("2 handler rule(s)")
				.hasMessageContaining(NoAudience.class.getName())
				.hasMessageContaining(TutorOnStudent.class.getName());
		});
	}

	@Test
	void startsWithValidHandlersAndTheMethodAnnotationWinsOverTheClass() {
		web.withUserConfiguration(Valid.class, MethodWins.class, StudentWebHandlers.ValidStudent.class).run(context -> {
			assertThat(context).hasNotFailed();
			assertThat(context).hasSingleBean(AudienceVerifier.class);
		});
	}

	@Test
	void doesNotRunWithoutAWebApplication() {
		new ApplicationContextRunner().withUserConfiguration(AudienceVerifier.class, NoAudience.class).run(context -> {
			assertThat(context).hasNotFailed();
			assertThat(context).doesNotHaveBean(AudienceVerifier.class);
		});
	}

	// ---- SEC round 1: other handler mappings (S3-1) and the pattern parser (S4-3) -------------------------------

	@Test
	void refusesFunctionalRoutes() {
		web.withUserConfiguration(Routes.class).run(context -> assertThat(failure(context))
			.hasMessageContaining("RouterFunctionMapping: functional routes"));
	}

	@Test
	void refusesAUrlHandlerMappingUnderApi() {
		web.withUserConfiguration(ApiUrlMapping.class).run(context -> assertThat(failure(context))
			.hasMessageContaining("/api/v1/tutor/legacy -> org.springframework.web.servlet.mvc.ParameterizableViewController")
			.hasMessageContaining("a URL handler mapping under /api"));
	}

	@Test
	void refusesAUrlHandlerMappingWithAnApplicationHandler() {
		web.withUserConfiguration(EnglmsUrlMapping.class).run(context -> assertThat(failure(context))
			.hasMessageContaining("/legacy -> " + LegacyHandler.class.getName()));
	}

	@Test
	void allowsTheSpaResourceHandlers() {
		web.withUserConfiguration(SpaWebConfiguration.class, Valid.class).run(context -> {
			assertThat(context).hasNotFailed();
			assertThat(context).hasSingleBean(AudienceVerifier.class);
		});
	}

	@Test
	void refusesACaseInsensitivePatternParser() {
		web.withUserConfiguration(CaseInsensitiveMatching.class, Valid.class).run(context -> assertThat(failure(context))
			.hasMessageContaining("RequestMappingHandlerMapping: not matching with a case-sensitive PathPatternParser"));
	}

	@Test
	@SuppressWarnings("removal")
	void refusesLegacyAntPathMatching() {
		web.withUserConfiguration(AntPathMatching.class, Valid.class).run(context -> assertThat(failure(context))
			.hasMessageContaining("RequestMappingHandlerMapping: not matching with a case-sensitive PathPatternParser"));
	}

	// ---- SEC round 2: application-defined mappings (N2-1), bean-name handlers (N2-2), inherited methods (N2-3) ----

	@Test
	void refusesAnApplicationDefinedHandlerMapping() {
		web.withUserConfiguration(CustomMapping.class).run(context -> assertThat(failure(context))
			.hasMessageContaining("an application-defined HandlerMapping"));
	}

	@Test
	void resolvesABeanNameHandlerToItsType() {
		web.withUserConfiguration(PrototypeUrlMapping.class).run(context -> assertThat(failure(context))
			.hasMessageContaining("/x-proto -> " + LegacyHandler.class.getName()));
	}

	/** T-M2.3 G3 SEC-S3-2: a binding annotation would bind CurrentStudent from the request; a bare one is accepted (Valid start). */
	@Test
	void refusesEveryBindingAnnotationOnACurrentStudentParameter() {
		web.withUserConfiguration(StudentWebHandlers.BoundCurrentStudent.class).run(context -> {
			String failure = failure(context).getMessage();
			for (String binding : List.of("ModelAttribute", "RequestBody", "RequestParam", "PathVariable", "RequestHeader",
					"CookieValue", "MatrixVariable", "RequestPart", "RequestAttribute", "SessionAttribute")) {
				assertThat(failure).contains("CurrentStudent parameter #0 carries @" + binding + ":");
			}
			assertThat(failure).contains("10 handler rule(s)");
		});
	}

	@Test
	void refusesAStudentHandlerMethodInheritedFromOutsideStudentWeb() {
		web.withUserConfiguration(StudentWebHandlers.InheritsFromOutside.class).run(context -> assertThat(failure(context))
			.hasMessageContaining("a STUDENT handler method declared outside a ..web.student.. package ("
					+ fixture.verifier.InheritedStudentHandlers.class.getName()));
	}

	@Configuration(proxyBeanMethods = false)
	static class CustomMapping {

		@Bean
		org.springframework.web.servlet.HandlerMapping custom() {
			return request -> null;
		}

	}

	@Configuration(proxyBeanMethods = false)
	static class PrototypeUrlMapping {

		@Bean("protoHandler")
		@org.springframework.context.annotation.Scope("prototype")
		LegacyHandler protoHandler() {
			return new LegacyHandler();
		}

		@Bean
		SimpleUrlHandlerMapping proto() {
			return new SimpleUrlHandlerMapping(Map.of("/x-proto", "protoHandler"));
		}

	}

	static Throwable failure(org.springframework.boot.test.context.assertj.AssertableWebApplicationContext context) {
		assertThat(context).hasFailed();
		Throwable cause = NestedExceptionUtils.getMostSpecificCause(context.getStartupFailure());
		assertThat(cause).isInstanceOf(IllegalStateException.class).hasMessageContaining("@Audience check failed");
		return cause;
	}

	@Configuration(proxyBeanMethods = false)
	static class Routes {

		@Bean
		RouterFunction<ServerResponse> studentRoute() {
			return RouterFunctions.route().GET("/api/v1/student/rf", request -> ServerResponse.ok().build()).build();
		}

	}

	@Configuration(proxyBeanMethods = false)
	static class ApiUrlMapping {

		@Bean
		SimpleUrlHandlerMapping legacyApi() {
			return new SimpleUrlHandlerMapping(Map.of("/api/v1/tutor/legacy", new ParameterizableViewController()));
		}

	}

	@Configuration(proxyBeanMethods = false)
	static class EnglmsUrlMapping {

		@Bean
		SimpleUrlHandlerMapping legacy() {
			return new SimpleUrlHandlerMapping(Map.of("/legacy", new LegacyHandler()));
		}

	}

	static class LegacyHandler implements HttpRequestHandler {

		@Override
		public void handleRequest(HttpServletRequest request, HttpServletResponse response) {
		}

	}

	@Configuration(proxyBeanMethods = false)
	static class CaseInsensitiveMatching implements WebMvcConfigurer {

		@Override
		public void configurePathMatch(PathMatchConfigurer configurer) {
			PathPatternParser parser = new PathPatternParser();
			parser.setCaseSensitive(false);
			configurer.setPatternParser(parser);
		}

	}

	@Configuration(proxyBeanMethods = false)
	@SuppressWarnings("removal")
	static class AntPathMatching implements WebMvcConfigurer {

		@Override
		public void configurePathMatch(PathMatchConfigurer configurer) {
			configurer.setPathMatcher(new org.springframework.util.AntPathMatcher());
		}

	}

	@Configuration(proxyBeanMethods = false)
	@EnableWebMvc
	static class Mvc {

	}

	@RestController
	static class StudentOutsideStudentWeb {

		@GetMapping("/api/v1/student/probe")
		@Audience(STUDENT)
		String probe() {
			return "";
		}

	}

	@RestController
	static class WildcardFirstSegment {

		@GetMapping("/*/v1/tutor/probe")
		@Audience(TUTOR)
		String probe() {
			return "";
		}

	}

	@RestController
	static class NoAudience {

		@GetMapping("/api/v1/tutor/probe")
		String probe() {
			return "";
		}

	}

	@RestController
	static class StudentOnTutor {

		@GetMapping("/api/v1/tutor/probe")
		@Audience(STUDENT)
		String probe() {
			return "";
		}

	}

	@RestController
	static class AuthenticatedOnTutor {

		@GetMapping("/api/v1/tutor/probe")
		@Audience(AUTHENTICATED)
		String probe() {
			return "";
		}

	}

	@RestController
	static class TutorOnStudent {

		@GetMapping("/api/v1/student/probe")
		@Audience(TUTOR)
		String probe() {
			return "";
		}

	}

	@RestController
	static class AuthenticatedOnStudent {

		@GetMapping("/api/v1/student/probe")
		@Audience(AUTHENTICATED)
		String probe() {
			return "";
		}

	}

	@RestController
	static class TutorOnAuth {

		@GetMapping("/api/v1/auth/probe")
		@Audience(TUTOR)
		String probe() {
			return "";
		}

	}

	@RestController
	static class StudentOnAuth {

		@PostMapping("/api/v1/auth/probe")
		@Audience(STUDENT)
		String probe() {
			return "";
		}

	}

	@RestController
	static class AuthenticatedOnMeta {

		@GetMapping("/api/v1/meta")
		@Audience(AUTHENTICATED)
		String probe() {
			return "";
		}

	}

	@RestController
	static class PostPublicOnMeta {

		@PostMapping("/api/v1/meta")
		@Audience(PUBLIC)
		String probe() {
			return "";
		}

	}

	@RestController
	static class PublicOnStudent {

		@GetMapping("/api/v1/student/probe")
		@Audience(PUBLIC)
		String probe() {
			return "";
		}

	}

	@RestController
	static class PublicOnTutor {

		@GetMapping("/api/v1/tutor/probe")
		@Audience(PUBLIC)
		String probe() {
			return "";
		}

	}

	@RestController
	static class UnknownApiPrefix {

		@GetMapping("/api/v1/probe")
		@Audience(TUTOR)
		String probe() {
			return "";
		}

	}

	@RestController
	static class DotSegments {

		@GetMapping("/api/v1/tutor/{x}/../../student/probe")
		@Audience(TUTOR)
		String probe() {
			return "";
		}

	}

	@RestController
	static class EmptySegment {

		@GetMapping("/api/v1/tutor//probe")
		@Audience(TUTOR)
		String probe() {
			return "";
		}

	}

	@RestController
	static class OutsideApi {

		@GetMapping("/probe")
		@Audience(PUBLIC)
		String probe() {
			return "";
		}

	}

	@RestController
	static class NoHttpMethod {

		@RequestMapping("/api/v1/tutor/probe")
		@Audience(TUTOR)
		String probe() {
			return "";
		}

	}

	@RestController
	static class MultiPattern {

		@GetMapping({ "/api/v1/tutor/probe", "/api/v1/student/probe" })
		@Audience(TUTOR)
		String probe() {
			return "";
		}

	}

	@RestController
	@Audience(STUDENT)
	static class ClassLevelWrong {

		@GetMapping("/api/v1/tutor/probe")
		String probe() {
			return "";
		}

	}

	@RestController
	static class Valid {

		@GetMapping("/api/v1/tutor/a")
		@Audience(TUTOR)
		String tutor() {
			return "";
		}

		@PostMapping("/api/v1/auth/a")
		@Audience(PUBLIC)
		String authPublic() {
			return "";
		}

		@PostMapping("/api/v1/auth/b")
		@Audience(AUTHENTICATED)
		String authAuthenticated() {
			return "";
		}

		@RequestMapping(path = "/api/v1/meta", method = { RequestMethod.GET, RequestMethod.HEAD })
		@Audience(PUBLIC)
		String meta() {
			return "";
		}

	}

	@RestController
	@Audience(TUTOR)
	static class MethodWins {

		@GetMapping("/api/v1/tutor/b")
		String tutor() {
			return "";
		}

		@PostMapping("/api/v1/auth/c")
		@Audience(PUBLIC)
		String auth() {
			return "";
		}

	}

}
