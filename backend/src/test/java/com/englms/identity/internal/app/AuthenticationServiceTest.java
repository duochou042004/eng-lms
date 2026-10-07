package com.englms.identity.internal.app;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import com.englms.identity.SessionTerminator;
import com.englms.identity.events.ClientInfo;
import com.englms.identity.events.LoginFailed;
import com.englms.identity.internal.domain.PasswordPolicy;
import com.englms.identity.internal.persistence.UserAccountRepository;
import com.englms.identity.internal.security.IdentityProperties;
import com.englms.identity.internal.security.LoginThrottle;
import com.englms.shared.ProblemException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;

/** T16, deterministic half: an unknown username still runs the password encoder once. */
class AuthenticationServiceTest {

	final UserAccountRepository accounts = mock(UserAccountRepository.class);

	final PasswordEncoder encoder = mock(PasswordEncoder.class);

	final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);

	AuthenticationService service() {
		when(encoder.encode(anyString())).thenReturn("{bcrypt}dummy");
		Clock clock = Clock.systemUTC();
		IdentityProperties properties = new IdentityProperties(new IdentityProperties.Lockout(10, Duration.ofMinutes(15)),
				new IdentityProperties.LoginThrottle(30, Duration.ofMinutes(5)),
				new IdentityProperties.RememberMe(Duration.ofDays(30)));
		return new AuthenticationService(accounts, encoder, new PasswordPolicy(),
				new LoginThrottle(30, Duration.ofMinutes(5), clock), mock(SessionTerminator.class), properties, events,
				mock(PlatformTransactionManager.class), clock);
	}

	@Test
	void anUnknownUsernameRunsTheEncoderAgainstTheDummyHash() {
		when(accounts.findByUsernameNormalized(anyString())).thenReturn(Optional.empty());
		AuthenticationService service = service();

		assertThatThrownBy(() -> service.login("nobody", "secret-attempt", new ClientInfo("10.0.0.1", null)))
			.isInstanceOf(ProblemException.class);

		verify(encoder).matches("secret-attempt", "{bcrypt}dummy");
		verify(events).publishEvent(new LoginFailed(null, LoginFailed.Reason.UNKNOWN_USERNAME, new ClientInfo("10.0.0.1", null)));
		verify(accounts).findByUsernameNormalized(eq("nobody"));
	}

	/** SEC review S2-2: over-long input is answered generically without a lookup, but still costs one bcrypt. */
	@Test
	void overLongInputIsNeverLookedUpButStillRunsTheEncoder() {
		AuthenticationService service = service();
		ClientInfo client = new ClientInfo("10.0.0.1", null);

		assertThatThrownBy(() -> service.login("u".repeat(65), "x", client)).isInstanceOf(ProblemException.class);
		assertThatThrownBy(() -> service.login("tutor", "p".repeat(1025), client)).isInstanceOf(ProblemException.class);
		assertThatThrownBy(() -> service.login("tu\u0000tor", "x", client)).isInstanceOf(ProblemException.class);

		verify(accounts, never()).findByUsernameNormalized(any());
		verify(encoder, times(3)).matches(AuthenticationService.REJECTED_INPUT_PROBE, "{bcrypt}dummy");
		verify(events, times(3)).publishEvent(new LoginFailed(null, LoginFailed.Reason.REJECTED_INPUT, client));
	}

}
