package com.englms.identity.internal.web;

import static com.englms.shared.web.Audience.Kind.AUTHENTICATED;
import static com.englms.shared.web.Audience.Kind.PUBLIC;

import java.util.Optional;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

import com.englms.identity.CurrentUser;
import com.englms.identity.Role;
import com.englms.identity.events.ClientInfo;
import com.englms.identity.internal.app.AccountService;
import com.englms.identity.internal.app.AccountView;
import com.englms.identity.internal.app.AuthenticationService;
import com.englms.identity.internal.app.AuthenticationService.PasswordChangeRejected;
import com.englms.identity.internal.app.PreferencesCommand;
import com.englms.identity.internal.security.AuthProblems;
import com.englms.shared.web.Audience;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Sign-in, session, logout, own-password change and own preferences (api-catalog.md "auth"; FR-AUTH-03..06,
 * FR-SET-02). {@code /api/v1/auth/**}
 * is open at the URL gate: each handler decides. Login neither accepts nor returns a redirect target (T18).
 */
@RestController
@RequestMapping(path = "/api/v1/auth", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "auth")
class AuthController {

	private static final String PROBLEM = "#/components/schemas/Problem";

	private final AuthenticationService authentication;

	private final AuthSessions sessions;

	private final AccountService accounts;

	AuthController(AuthenticationService authentication, AuthSessions sessions, AccountService accounts) {
		this.authentication = authentication;
		this.sessions = sessions;
		this.accounts = accounts;
	}

	@GetMapping("/session")
	@Audience(PUBLIC)
	@Operation(summary = "The signed-in user; also sets the XSRF-TOKEN cookie, for anonymous callers too")
	@ApiResponse(responseCode = "200", description = "Signed in")
	@ApiResponse(responseCode = "401", description = "UNAUTHENTICATED (no session cookie) or SESSION_EXPIRED",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	SessionResponse session(@AuthenticationPrincipal CurrentUser me, HttpServletRequest request) {
		AuthSessions.primeCsrfCookie(request);
		if (me == null) {
			throw AuthProblems.unauthenticated(request);
		}
		return authentication.view(me.userId())
			.map(SessionResponse::of)
			.orElseThrow(() -> AuthProblems.unauthenticated(request));
	}

	@Audience(PUBLIC)
	@PostMapping(path = "/login", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Sign in with username and password; rotates the session ID")
	@ApiResponse(responseCode = "200", description = "Signed in")
	@ApiResponse(responseCode = "401", description = "UNAUTHENTICATED: one generic answer for every failure",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	@ApiResponse(responseCode = "403", description = "CSRF_INVALID",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	@ApiResponse(responseCode = "429", description = "RATE_LIMITED, with Retry-After",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	SessionResponse login(@RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
		AccountView account = authentication.login(body.username(), body.password(), client(request));
		sessions.signIn(account.currentUser(), Boolean.TRUE.equals(body.rememberMe()), request, response);
		return SessionResponse.of(account);
	}

	@PostMapping("/logout")
	@Audience(PUBLIC)
	@Operation(summary = "End this session and this device's remember-me token (idempotent)")
	@ApiResponse(responseCode = "204", description = "Signed out")
	@ApiResponse(responseCode = "403", description = "CSRF_INVALID",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	ResponseEntity<Void> logout(Authentication principal, HttpServletRequest request, HttpServletResponse response) {
		sessions.signOut(principal, request, response);
		return ResponseEntity.noContent().build();
	}

	@Audience(AUTHENTICATED)
	@PostMapping(path = "/password", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Change the own password; ends every other session and remember-me token")
	@ApiResponse(responseCode = "204", description = "Changed; the session ID rotated")
	@ApiResponse(responseCode = "401", description = "UNAUTHENTICATED or SESSION_EXPIRED",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	@ApiResponse(responseCode = "403", description = "CSRF_INVALID",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	@ApiResponse(responseCode = "422", description = "VALIDATION_FAILED with errors[] (CURRENT_PASSWORD_INCORRECT, "
			+ "PASSWORD_TOO_SHORT, PASSWORD_TOO_LONG, PASSWORD_TOO_COMMON, PASSWORD_EQUALS_USERNAME, PASSWORD_UNCHANGED)",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	ResponseEntity<Void> changePassword(@AuthenticationPrincipal CurrentUser me, @RequestBody ChangePasswordRequest body,
			HttpServletRequest request, HttpServletResponse response) {
		if (me == null) {
			throw AuthProblems.unauthenticated(request);
		}
		HttpSession session = request.getSession(false);
		AccountView account;
		try {
			account = authentication.changePassword(me.userId(), body.currentPassword(), body.newPassword(),
					client(request), (session != null) ? session.getId() : null);
		}
		catch (PasswordChangeRejected ex) {
			if (ex.sessionsEnded()) {
				sessions.discard(request);
			}
			throw ex;
		}
		sessions.passwordChanged(account.currentUser(), request, response);
		return ResponseEntity.noContent().build();
	}

	@Audience(AUTHENTICATED)
	@PatchMapping(path = "/preferences", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Save the own language, time zone and (tutor only) display name; absent properties stay; "
			+ "last write wins per property, no version (DEC-190)")
	@ApiResponse(responseCode = "200", description = "The session body with the saved values")
	@ApiResponse(responseCode = "401", description = "UNAUTHENTICATED or SESSION_EXPIRED",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	@ApiResponse(responseCode = "403", description = "CSRF_INVALID or PASSWORD_CHANGE_REQUIRED",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	@ApiResponse(responseCode = "422", description = "VALIDATION_FAILED with field codes (REQUIRED, INVALID_VALUE, "
			+ "TOO_LONG, INVALID_FORMAT); an empty body is REQUIRED on locale",
			content = @Content(mediaType = "application/problem+json", schema = @Schema(ref = PROBLEM)))
	SessionResponse updatePreferences(@AuthenticationPrincipal CurrentUser me, @RequestBody PreferencesRequest body,
			HttpServletRequest request) {
		if (me == null) {
			throw AuthProblems.unauthenticated(request);
		}
		return accounts.updatePreferences(me.userId(), body.command())
			.map(SessionResponse::of)
			.orElseThrow(() -> AuthProblems.unauthenticated(request));
	}

	private static ClientInfo client(HttpServletRequest request) {
		String userAgent = request.getHeader(HttpHeaders.USER_AGENT);
		return new ClientInfo(request.getRemoteAddr(),
				(userAgent != null && userAgent.length() > 512) ? userAgent.substring(0, 512) : userAgent);
	}

	@Schema(requiredProperties = { "username", "password" })
	record LoginRequest(String username, String password, Boolean rememberMe) {

		@Override
		public String toString() {
			return "LoginRequest[username=" + username + ", rememberMe=" + rememberMe + "]";
		}

	}

	@Schema(requiredProperties = { "currentPassword", "newPassword" })
	record ChangePasswordRequest(String currentPassword, String newPassword) {

		@Override
		public String toString() {
			return "ChangePasswordRequest[]";
		}

	}

	/**
	 * PATCH (api-conventions §3) with the setter pattern of {@code TutorStudentDtos.UpdateStudentRequest}: Jackson calls
	 * a setter only for a present property, so a field is {@code null} while absent and an {@link Optional} once
	 * present. Only these three properties are read; unknown ones are ignored.
	 */
	static final class PreferencesRequest {

		private Optional<String> locale;

		private Optional<String> timeZone;

		private Optional<String> displayName;

		@Schema(description = "One of GET /meta locales")
		public String getLocale() {
			return value(locale);
		}

		public void setLocale(String locale) {
			this.locale = Optional.ofNullable(locale);
		}

		@Schema(description = "A time-zone ID the server's java.time knows, exact (aliases accepted as given)")
		public String getTimeZone() {
			return value(timeZone);
		}

		public void setTimeZone(String timeZone) {
			this.timeZone = Optional.ofNullable(timeZone);
		}

		@Schema(types = { "string", "null" }, description = "Tutor only; empty or null clears it")
		public String getDisplayName() {
			return value(displayName);
		}

		public void setDisplayName(String displayName) {
			this.displayName = Optional.ofNullable(displayName);
		}

		PreferencesCommand command() {
			return new PreferencesCommand(locale, timeZone, displayName);
		}

		private static String value(Optional<String> field) {
			return (field != null) ? field.orElse(null) : null;
		}

		@Override
		public String toString() {
			return "PreferencesRequest[]";
		}

	}

	@Schema(requiredProperties = { "userId", "username", "role", "displayName", "locale", "timeZone",
			"mustChangePassword" })
	record SessionResponse(UUID userId, String username, Role role,
			@Schema(types = { "string", "null" }) String displayName, String locale,
			String timeZone, boolean mustChangePassword) {

		static SessionResponse of(AccountView account) {
			return new SessionResponse(account.userId(), account.username(), account.role(), account.displayName(),
					account.locale(), account.timeZone(), account.mustChangePassword());
		}

	}

}
