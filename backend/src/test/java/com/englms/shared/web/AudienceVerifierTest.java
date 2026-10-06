package com.englms.shared.web;

import static com.englms.shared.web.Audience.Kind.AUTHENTICATED;
import static com.englms.shared.web.Audience.Kind.PUBLIC;
import static com.englms.shared.web.Audience.Kind.STUDENT;
import static com.englms.shared.web.Audience.Kind.TUTOR;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.stream.Stream;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

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
				Arguments.of(ClassLevelWrong.class, "STUDENT on /api/v1/tutor/**"));
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
		web.withUserConfiguration(Valid.class, MethodWins.class).run(context -> {
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

	@Configuration(proxyBeanMethods = false)
	@EnableWebMvc
	static class Mvc {

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

		@PostMapping("/api/v1/student/a")
		@Audience(STUDENT)
		String student() {
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

		@GetMapping("/api/v1/student/b")
		@Audience(STUDENT)
		String student() {
			return "";
		}

	}

}
