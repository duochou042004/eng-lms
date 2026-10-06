package com.englms.shared.web;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.englms.shared.web.Audience.Kind;
import org.springframework.beans.factory.BeanFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.stereotype.Component;
import org.springframework.util.ClassUtils;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.servlet.function.support.RouterFunctionMapping;
import org.springframework.web.servlet.handler.AbstractUrlHandlerMapping;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.springframework.web.util.pattern.PathPatternParser;

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
 * <p>
 * Since T-M2.2 SEC round 1: a pattern whose first segment is not a literal ({@code /{x}}, {@code /**},
 * {@code /{*rest}}) counts as an API pattern (it can match {@code /api/**}) and is refused (S4-1); a
 * {@code STUDENT} handler must live in a {@code ..web.student..} package and a {@code ..web.student..} handler must be
 * {@code STUDENT} (S3-3); a {@code /api/v1/student/**} pattern must not carry a {@code {…studentId}} variable (S4-2);
 * every request-mapping handler mapping must use a case-sensitive {@link PathPatternParser} (S4-3). Other handler
 * mappings have no {@code @Audience}, so they are refused where they could serve the API: functional routes
 * ({@link RouterFunctionMapping} with a router function) and URL mappings under {@code /api} or with a
 * {@code com.englms} handler (S3-1). The SPA's resource handlers ({@code /**}, {@code /assets/**}) stay allowed.
 */
@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class AudienceVerifier implements SmartInitializingSingleton {

	static final String TUTOR = "/api/v1/tutor";

	static final String STUDENT = "/api/v1/student";

	static final String AUTH = "/api/v1/auth";

	static final String META = "/api/v1/meta";

	private static final Set<RequestMethod> META_METHODS = Set.of(RequestMethod.GET, RequestMethod.HEAD);

	private static final Pattern VARIABLE = Pattern.compile("\\{\\*?([^}:]+)");

	private final ObjectProvider<HandlerMapping> mappings;

	private final BeanFactory beans;

	AudienceVerifier(ObjectProvider<HandlerMapping> mappings, BeanFactory beans) {
		this.mappings = mappings;
		this.beans = beans;
	}

	@Override
	public void afterSingletonsInstantiated() {
		List<String> errors = new ArrayList<>();
		mappings.orderedStream().forEach(mapping -> {
			switch (mapping) {
				case RequestMappingHandlerMapping requestMappings -> {
					PathPatternParser parser = requestMappings.getPatternParser();
					if (parser == null || !parser.isCaseSensitive()) {
						errors.add(mapping.getClass().getName()
								+ ": not matching with a case-sensitive PathPatternParser (the URL gate's rules would not hold)");
					}
					handlers(requestMappings).forEach(handler -> {
						Audience audience = audienceOf(handler.method());
						violations((audience != null) ? audience.value() : null, handler.methods(), handler.patterns(),
								handler.isEnglms(), handler.method().getBeanType(),
								handler.method().getMethod().getDeclaringClass())
							.forEach(violation -> errors.add(handler + ": " + violation));
					});
				}
				case RouterFunctionMapping routes when routes.getRouterFunction() != null -> errors.add(mapping.getClass()
					.getName() + ": functional routes (RouterFunction beans) cannot carry @Audience; use @RestController handlers");
				case AbstractUrlHandlerMapping urls -> urls.getHandlerMap().forEach((pattern, handler) -> {
					// A non-singleton handler stays a bean name; check the type it names (SEC round 2 N2-2).
					Class<?> resolved = (handler instanceof String name) ? beans.getType(name) : handler.getClass();
					String type = (resolved != null) ? ClassUtils.getUserClass(resolved).getName() : "unresolvable bean " + handler;
					if (under(pattern, "/api") || type.startsWith("com.englms.")) {
						errors.add(mapping.getClass().getName() + " " + pattern + " -> " + type
								+ ": a URL handler mapping under /api or with a com.englms handler (no @Audience possible)");
					}
				});
				default -> {
					// Framework mappings (e.g. a router-function mapping without routes) serve no application handler; an
					// application-defined mapping could serve anything unchecked (SEC round 2 N2-1).
					Class<?> type = mapping.getClass();
					if (type.getName().startsWith("com.englms.") || type.isHidden() || type.isSynthetic()) {
						errors.add(type.getName() + ": an application-defined HandlerMapping (no @Audience possible)");
					}
				}
			}
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
	static List<String> violations(Kind audience, Set<RequestMethod> methods, Set<String> patterns, boolean englms,
			Class<?> beanType, Class<?> declaringClass) {
		List<String> violations = new ArrayList<>();
		if (audience == null) {
			violations.add("no @Audience on the method or its class");
		}
		boolean studentWeb = isStudentWeb(beanType);
		if (audience == Kind.STUDENT && !studentWeb) {
			violations.add("a STUDENT handler outside a ..web.student.. package (ADR-0016 §4)");
		}
		if (audience == Kind.STUDENT && studentWeb && !isStudentWeb(declaringClass)) {
			// Rule 3 checks methods declared in ..web.student..; an inherited one would escape it (SEC round 2 N2-3).
			violations.add("a STUDENT handler method declared outside a ..web.student.. package (" + declaringClass.getName()
					+ ")");
		}
		if (studentWeb && audience != null && audience != Kind.STUDENT) {
			violations.add(audience + " on a ..web.student.. handler (STUDENT only)");
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
		if (!literalFirstSegment(pattern)) {
			return "the first segment is not a literal, so the pattern can match /api/** paths";
		}
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
			Matcher variable = VARIABLE.matcher(pattern);
			while (variable.find()) {
				if (isStudentId(variable.group(1))) {
					return "a student ID path variable {" + variable.group(1) + "} on /api/v1/student/** (ADR-0016 §2)";
				}
			}
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

	/** Under {@code /api}, or with a first segment that is not a literal (it may match {@code /api/**} too). */
	private static boolean isStudentWeb(Class<?> type) {
		return ("." + type.getPackageName() + ".").contains(".web.student.");
	}

	private static boolean isApi(String pattern) {
		return under(pattern, "/api") || !literalFirstSegment(pattern);
	}

	private static boolean literalFirstSegment(String pattern) {
		String first = pattern.startsWith("/") ? pattern.substring(1) : pattern;
		int slash = first.indexOf('/');
		first = (slash < 0) ? first : first.substring(0, slash);
		return first.chars().noneMatch(c -> c == '{' || c == '*' || c == '?');
	}

	/** {@code studentId} or a name ending in it, ignoring case, {@code _} and {@code -} (as ArchUnit rule 3). */
	static boolean isStudentId(String name) {
		return name.replace("_", "").replace("-", "").toLowerCase(Locale.ROOT).endsWith("studentid");
	}

	private static boolean under(String pattern, String prefix) {
		return pattern.equals(prefix) || pattern.startsWith(prefix + "/");
	}

}
