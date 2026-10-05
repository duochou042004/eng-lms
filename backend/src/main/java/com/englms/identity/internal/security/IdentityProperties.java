package com.englms.identity.internal.security;

import java.time.Duration;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Sign-in protection ({@code englms.security.*}, defaults in application.properties): the lockout (NFR-SEC-05:
 * 10 failures, 15 minutes), the per-IP throttle (30 attempts per 5 minutes, instance-local) and the remember-me
 * validity (A-021, OQ-10: 30 days). The idle timeout is {@code server.servlet.session.timeout} (12 h).
 */
@Validated
@ConfigurationProperties("englms.security")
public record IdentityProperties(@Valid @NotNull Lockout lockout, @Valid @NotNull LoginThrottle loginThrottle,
		@Valid @NotNull RememberMe rememberMe) {

	public record Lockout(@Min(1) int maxFailures, @NotNull Duration duration) {
	}

	public record LoginThrottle(@Min(1) int maxAttempts, @NotNull Duration window) {
	}

	public record RememberMe(@NotNull Duration validity) {
	}

}
