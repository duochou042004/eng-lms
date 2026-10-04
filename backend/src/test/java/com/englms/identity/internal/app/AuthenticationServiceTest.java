package com.englms.identity.internal.app;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
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
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

/** T16, deterministic half: an unknown username still runs the password encoder once. */
class AuthenticationServiceTest {

	@Test
	void anUnknownUsernameRunsTheEncoderAgainstTheDummyHash() {
		UserAccountRepository accounts = mock(UserAccountRepository.class);
		when(accounts.findForUpdateByUsernameNormalized(anyString())).thenReturn(Optional.empty());
		PasswordEncoder encoder = mock(PasswordEncoder.class);
		when(encoder.encode(anyString())).thenReturn("{bcrypt}dummy");
		TransactionTemplate transactions = mock(TransactionTemplate.class);
		when(transactions.execute(any())).thenAnswer(call -> ((TransactionCallback<?>) call.getArgument(0)).doInTransaction(null));
		ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
		Clock clock = Clock.systemUTC();
		IdentityProperties properties = new IdentityProperties(new IdentityProperties.Lockout(10, Duration.ofMinutes(15)),
				new IdentityProperties.LoginThrottle(30, Duration.ofMinutes(5)),
				new IdentityProperties.RememberMe(Duration.ofDays(30)));
		AuthenticationService service = new AuthenticationService(accounts, encoder, new PasswordPolicy(),
				new LoginThrottle(30, Duration.ofMinutes(5), clock), mock(SessionTerminator.class), properties, events,
				transactions, clock);

		assertThatThrownBy(() -> service.login("nobody", "secret-attempt", new ClientInfo("10.0.0.1", null)))
			.isInstanceOf(ProblemException.class);

		verify(encoder).matches("secret-attempt", "{bcrypt}dummy");
		verify(events).publishEvent(new LoginFailed(null, LoginFailed.Reason.UNKNOWN_USERNAME, new ClientInfo("10.0.0.1", null)));
		verify(accounts).findForUpdateByUsernameNormalized(eq("nobody"));
	}

}
