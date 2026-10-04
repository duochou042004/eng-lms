package com.englms.identity.internal.security;

import java.security.SecureRandom;
import java.time.Clock;
import java.util.HexFormat;
import java.util.Map;

import javax.sql.DataSource;

import jakarta.servlet.ServletContext;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.englms.identity.internal.domain.PasswordPolicy;
import com.englms.identity.internal.domain.TemporaryPasswordGenerator;
import com.englms.shared.web.ProblemResponses;
import com.englms.shared.web.SecurityHeaders;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.authentication.rememberme.JdbcTokenRepositoryImpl;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.header.writers.CrossOriginOpenerPolicyHeaderWriter.CrossOriginOpenerPolicy;
import org.springframework.security.web.header.writers.DelegatingRequestMatcherHeaderWriter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;

/**
 * Spring Security (ADR-0005, security.md §3–§5). The beans at this level also exist in the operator CLI (no web
 * context); the filter chain lives in {@link Web}.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(IdentityProperties.class)
class SecurityConfiguration {

	/** {@code {bcrypt}} with strength 12 (NFR-SEC-07); argon2id is a later ADR (rehash on login). */
	@Bean
	PasswordEncoder passwordEncoder() {
		return new DelegatingPasswordEncoder("bcrypt",
				Map.of("bcrypt", new TruncatingBCryptPasswordEncoder(new SecureRandom())));
	}

	@Bean
	PasswordPolicy passwordPolicy() {
		return new PasswordPolicy();
	}

	@Bean
	TemporaryPasswordGenerator temporaryPasswordGenerator() {
		return new TemporaryPasswordGenerator(new SecureRandom());
	}

	@Bean
	LoginThrottle loginThrottle(IdentityProperties properties, Clock clock) {
		return new LoginThrottle(properties.loginThrottle().maxAttempts(), properties.loginThrottle().window(), clock);
	}

	@Bean
	HttpSessionSecurityContextRepository securityContextRepository() {
		return new HttpSessionSecurityContextRepository();
	}

	/** SPA CSRF (ADR-0005): {@code XSRF-TOKEN} readable by JavaScript, echoed in {@code X-XSRF-TOKEN}. */
	@Bean
	ApiCsrfTokenRepository csrfTokenRepository(
			@Value("${server.servlet.session.cookie.secure:true}") boolean secureCookies) {
		CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
		repository.setCookieCustomizer(cookie -> cookie.secure(secureCookies).sameSite("Lax").path("/"));
		return new ApiCsrfTokenRepository(repository);
	}

	/**
	 * The remember-me key only ties the cookie-based authentication to this service inside one process (the tokens
	 * themselves live in the database), so a random key per start is enough.
	 */
	@Bean
	AccountRememberMeServices rememberMeServices(AccountUserDetailsService users, DataSource dataSource,
			JdbcTemplate jdbc, IdentityProperties properties,
			@Value("${server.servlet.session.cookie.secure:true}") boolean secureCookies) {
		JdbcTokenRepositoryImpl tokens = new JdbcTokenRepositoryImpl();
		tokens.setDataSource(dataSource);
		byte[] key = new byte[32];
		new SecureRandom().nextBytes(key);
		AccountRememberMeServices services = new AccountRememberMeServices(HexFormat.of().formatHex(key), users,
				tokens, jdbc);
		services.setTokenValiditySeconds((int) properties.rememberMe().validity().toSeconds());
		services.setUseSecureCookie(secureCookies);
		services.setCookieCustomizer(cookie -> cookie.setAttribute("SameSite", "Lax"));
		return services;
	}

	@Configuration(proxyBeanMethods = false)
	@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
	static class Web {

		private static final Logger log = LoggerFactory.getLogger(Web.class);

		/**
		 * NFR-SEC-04: cookies are {@code Secure}. Turning that off is only for a browser engine that refuses Secure
		 * cookies on {@code http://localhost}, under the {@code local} profile and never with {@code prod}
		 * (deployment.md §3); anywhere else startup fails. Outside {@code local}, a missing
		 * {@code server.forward-headers-strategy} is warned about: behind Caddy every client would share Caddy's IP in
		 * the throttle and the audit log (SEC review S4-7, S4-8).
		 */
		Web(Environment environment, @Value("${server.servlet.session.cookie.secure:true}") boolean secureCookies) {
			boolean local = environment.matchesProfiles("local");
			if (!secureCookies && (!local || environment.matchesProfiles("prod"))) {
				throw new IllegalStateException("server.servlet.session.cookie.secure=false is only allowed with the "
						+ "'local' Spring profile, never with 'prod' (NFR-SEC-04)");
			}
			if (!local && environment.getProperty("server.forward-headers-strategy") == null) {
				log.warn("server.forward-headers-strategy is not set: behind the reverse proxy every client has the "
						+ "proxy's IP (login throttle, audit). Set SERVER_FORWARDHEADERSSTRATEGY=native (deployment.md §3)");
			}
		}

		/**
		 * Order: CSRF (403 {@code CSRF_INVALID}) → authentication (401) → L1 role (403 {@code FORBIDDEN_ROLE}) →
		 * must-change gate (403 {@code PASSWORD_CHANGE_REQUIRED}) → handler lookup (404). "Everything else under
		 * {@code /api/**}" only requires authentication, so an authenticated caller passes the gate and gets the
		 * handler lookup's 404 (security.md §4, R4 D5-1); it is not {@code denyAll}.
		 */
		@Bean
		SecurityFilterChain securityFilterChain(HttpSecurity http, HttpSessionSecurityContextRepository contexts,
				ApiCsrfTokenRepository csrfTokens, AccountRememberMeServices rememberMe, ServletContext application) {
			// Boot also registers this filter on the management port (its child context reuses the bean). The chain
			// applies to the application port only: :8081 (health/info, never proxied) has no sessions, CSRF or
			// security headers (DEC-050).
			http.securityMatcher(request -> request.getServletContext() == application)
				.securityContext(context -> context.securityContextRepository(contexts))
				.csrf(csrf -> csrf.spa().csrfTokenRepository(csrfTokens))
				.headers(headers -> headers.defaultsDisabled()
					.contentTypeOptions(Customizer.withDefaults())
					.contentSecurityPolicy(csp -> csp.policyDirectives(SecurityHeaders.CONTENT_SECURITY_POLICY))
					.referrerPolicy(referrer -> referrer.policy(ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
					.permissionsPolicyHeader(permissions -> permissions.policy(SecurityHeaders.PERMISSIONS_POLICY))
					.crossOriginOpenerPolicy(coop -> coop.policy(CrossOriginOpenerPolicy.SAME_ORIGIN))
					// DEC-070: API responses are never cached. Assets and index.html keep their own Cache-Control (T-M1.5).
					.addHeaderWriter(new DelegatingRequestMatcherHeaderWriter(
							PathPatternRequestMatcher.pathPattern("/api/**"),
							new StaticHeadersWriter("Cache-Control", "no-store"))))
				.requestCache(cache -> cache.disable())
				.logout(logout -> logout.disable())
				.rememberMe(remember -> remember.rememberMeServices(rememberMe).key(rememberMe.getKey()))
				.exceptionHandling(exceptions -> exceptions.authenticationEntryPoint(AuthProblems::entryPoint)
					.accessDeniedHandler(AuthProblems::accessDenied))
				.authorizeHttpRequests(requests -> requests.requestMatchers("/api/v1/tutor/**")
					.hasRole("TUTOR")
					.requestMatchers("/api/v1/student/**")
					.hasRole("STUDENT")
					.requestMatchers("/api/v1/auth/**")
					.permitAll()
					.requestMatchers(HttpMethod.GET, "/api/v1/meta")
					.permitAll()
					.requestMatchers(HttpMethod.HEAD, "/api/v1/meta")
					.permitAll()
					.requestMatchers("/api/**")
					.authenticated()
					.anyRequest()
					.permitAll())
				.addFilterAfter(new MustChangePasswordFilter(), AuthorizationFilter.class);
			return http.build();
		}

		/**
		 * Requests the firewall rejects (raw dot-segments, {@code TRACE}, …) get Problem Details with the security
		 * headers, never the SPA shell or Boot's error page (DEC-054, DEC-069): 405 for a forbidden method, else 400.
		 */
		@Bean
		WebSecurityCustomizer firewallRejections() {
			return web -> web.requestRejectedHandler((request, response, ex) -> ProblemResponses.writeRejected(request,
					response, isAllowedMethod(request.getMethod()) ? HttpStatus.BAD_REQUEST.value()
							: HttpStatus.METHOD_NOT_ALLOWED.value()));
		}

		private static boolean isAllowedMethod(String method) {
			return switch (method) {
				case "GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS" -> true;
				default -> false;
			};
		}

	}

}
