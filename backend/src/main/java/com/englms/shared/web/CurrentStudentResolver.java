package com.englms.shared.web;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import com.englms.shared.ProblemCodes;
import com.englms.shared.ProblemException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Resolves {@link CurrentStudent} parameters from Spring Security's {@link Authentication} (ADR-0016 §2, security.md
 * §4 L3): its name is the user ID (identity's principal guarantees it), its authority {@code ROLE_STUDENT}. It never
 * reads a request parameter. A student principal without a student row ends the session: 401 {@code SESSION_EXPIRED}.
 * Anything else never passes L1 to a student handler, so it is a programming error ({@link IllegalStateException}).
 * Registers itself as an MVC argument resolver.
 */
@Component
class CurrentStudentResolver implements HandlerMethodArgumentResolver, WebMvcConfigurer {

	static final String STUDENT_AUTHORITY = "ROLE_STUDENT";

	private final ObjectProvider<StudentPrincipals> principals;

	CurrentStudentResolver(ObjectProvider<StudentPrincipals> principals) {
		this.principals = principals;
	}

	@Override
	public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
		resolvers.add(this);
	}

	@Override
	public boolean supportsParameter(MethodParameter parameter) {
		return parameter.getParameterType() == CurrentStudent.class;
	}

	@Override
	public CurrentStudent resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
			NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null || !authentication.isAuthenticated() || authentication.getAuthorities()
			.stream()
			.noneMatch(authority -> STUDENT_AUTHORITY.equals(authority.getAuthority()))) {
			throw new IllegalStateException("CurrentStudent without a student principal: L1 must refuse this request");
		}
		UUID userId = UUID.fromString(authentication.getName());
		Optional<UUID> studentId = principals.orderedStream()
			.map(spi -> spi.studentIdForUser(userId))
			.flatMap(Optional::stream)
			.findFirst();
		if (studentId.isEmpty()) {
			HttpSession session = webRequest.getNativeRequest(HttpServletRequest.class).getSession(false);
			if (session != null) {
				session.invalidate();
			}
			SecurityContextHolder.clearContext();
			throw new ProblemException(HttpStatus.UNAUTHORIZED, ProblemCodes.SESSION_EXPIRED);
		}
		return new CurrentStudent(studentId.get(), userId);
	}

}
