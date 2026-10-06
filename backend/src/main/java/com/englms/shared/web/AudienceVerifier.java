package com.englms.shared.web;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import com.englms.shared.web.Audience.Kind;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

/**
 * Security.md §4 L2: refuses to start the application when a handler's {@link Audience} is missing or contradicts its
 * path namespace (ADR-0016 §5). Runs after every singleton exists, before the web server listens.
 * <p>
 * A handler is in scope when its bean class is in {@code com.englms..} or one of its patterns is under {@code /api/}.
 * Rules, for each pattern: {@code /api/v1/tutor/**} → {@code TUTOR}; {@code /api/v1/student/**} → {@code STUDENT};
 * {@code /api/v1/auth/**} → {@code PUBLIC} or {@code AUTHENTICATED}; {@code /api/v1/meta} → {@code PUBLIC} with
 * {@code GET}/{@code HEAD} only (all the URL gate opens there); any other {@code /api/**} path, or a {@code com.englms}
 * handler outside {@code /api/**}, is an error, and so is an {@code /api/**} pattern with an empty, {@code .} or
 * {@code ..} segment (its namespace is ambiguous; T-M2.2 QA-S4-1). Every in-scope handler names its HTTP methods.
 * Third-party handlers outside {@code /api/**} (Boot's {@code /error}, springdoc) are ignored. The operator CLI has
 * no web application, so the check does not run there.
 */
@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class AudienceVerifier implements SmartInitializingSingleton {

	static final String TUTOR = "/api/v1/tutor";

	static final String STUDENT = "/api/v1/student";

	static final String AUTH = "/api/v1/auth";

	static final String META = "/api/v1/meta";

	private static final Set<RequestMethod> META_METHODS = Set.of(RequestMethod.GET, RequestMethod.HEAD);

	private final ObjectProvider<RequestMappingHandlerMapping> mappings;

	AudienceVerifier(ObjectProvider<RequestMappingHandlerMapping> mappings) {
		this.mappings = mappings;
	}

	@Override
	public void afterSingletonsInstantiated() {
		List<String> errors = new ArrayList<>();
		mappings.orderedStream().flatMap(mapping -> handlers(mapping).stream()).forEach(handler -> {
			Audience audience = audienceOf(handler.method());
			violations((audience != null) ? audience.value() : null, handler.methods(), handler.patterns(),
					handler.isEnglms())
				.forEach(violation -> errors.add(handler + ": " + violation));
		});
		if (!errors.isEmpty()) {
			throw new IllegalStateException("@Audience check failed (security.md §4 L2, ADR-0016 §5) for "
					+ errors.size() + " handler rule(s):\n - " + String.join("\n - ", errors));
		}
	}

	/** One handler mapping in L2 scope. */
	public record Handler(Set<RequestMethod> methods, Set<String> patterns, HandlerMethod method) {

		boolean isEnglms() {
			return method.getBeanType().getName().startsWith("com.englms.");
		}

		@Override
		public String toString() {
			return method.getBeanType().getName() + "#" + method.getMethod().getName() + " " + methods + " " + patterns;
		}

	}

	/** The handlers of {@code mapping} that the L2 rule covers (also the authz matrix's completeness source). */
	public static List<Handler> handlers(RequestMappingHandlerMapping mapping) {
		List<Handler> handlers = new ArrayList<>();
		mapping.getHandlerMethods().forEach((info, method) -> {
			Set<String> patterns = new TreeSet<>(info.getPatternValues());
			Handler handler = new Handler(Set.copyOf(info.getMethodsCondition().getMethods()), patterns, method);
			if (handler.isEnglms() || patterns.stream().anyMatch(AudienceVerifier::isApi)) {
				handlers.add(handler);
			}
		});
		return handlers;
	}

	static Audience audienceOf(HandlerMethod method) {
		Audience onMethod = method.getMethodAnnotation(Audience.class);
		return (onMethod != null) ? onMethod
				: AnnotatedElementUtils.findMergedAnnotation(method.getBeanType(), Audience.class);
	}

	/** The broken rules of one handler ({@code audience} null = not annotated); empty when it is fine. */
	static List<String> violations(Kind audience, Set<RequestMethod> methods, Set<String> patterns, boolean englms) {
		List<String> violations = new ArrayList<>();
		if (audience == null) {
			violations.add("no @Audience on the method or its class");
		}
		if (methods.isEmpty()) {
			violations.add("no explicit HTTP method (a bare @RequestMapping matches every method)");
		}
		for (String pattern : patterns) {
			String violation = violation(audience, methods, pattern, englms);
			if (violation != null) {
				violations.add(pattern + ": " + violation);
			}
		}
		return violations;
	}

	private static String violation(Kind audience, Set<RequestMethod> methods, String pattern, boolean englms) {
		if (!isApi(pattern)) {
			return englms ? "a com.englms handler outside /api/**" : null;
		}
		if (ambiguous(pattern)) {
			return "ambiguous path pattern (an empty, '.' or '..' segment hides its namespace)";
		}
		if (under(pattern, TUTOR)) {
			return expect(audience, Set.of(Kind.TUTOR), "/api/v1/tutor/**");
		}
		if (under(pattern, STUDENT)) {
			return expect(audience, Set.of(Kind.STUDENT), "/api/v1/student/**");
		}
		if (under(pattern, AUTH)) {
			return expect(audience, Set.of(Kind.PUBLIC, Kind.AUTHENTICATED), "/api/v1/auth/**");
		}
		if (pattern.equals(META)) {
			String wrong = expect(audience, Set.of(Kind.PUBLIC), META);
			if (wrong == null && audience != null && !META_METHODS.containsAll(methods)) {
				return "PUBLIC on " + methods + " " + META + " (the URL gate opens only GET and HEAD)";
			}
			return wrong;
		}
		return "unknown /api/** prefix (allowed: /api/v1/tutor/**, /api/v1/student/**, /api/v1/auth/**, /api/v1/meta)";
	}

	private static String expect(Kind audience, Set<Kind> allowed, String namespace) {
		return (audience == null || allowed.contains(audience)) ? null
				: audience + " on " + namespace + " (allowed: " + new TreeSet<>(allowed) + ")";
	}

	private static boolean ambiguous(String pattern) {
		String[] segments = pattern.substring(1).split("/", -1);
		return Arrays.stream(segments).anyMatch(s -> s.isEmpty() || s.equals(".") || s.equals(".."));
	}

	private static boolean isApi(String pattern) {
		return under(pattern, "/api");
	}

	private static boolean under(String pattern, String prefix) {
		return pattern.equals(prefix) || pattern.startsWith(prefix + "/");
	}

}
