package com.englms.identity.internal.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

import com.englms.identity.Role;
import com.englms.identity.SessionTerminator;
import com.englms.identity.internal.domain.PasswordPolicy;
import com.englms.identity.internal.domain.TemporaryPasswordGenerator;
import com.englms.identity.internal.domain.UserAccount;
import com.englms.identity.internal.persistence.UserAccountRepository;
import com.englms.settings.SettingsApi;
import com.englms.settings.SettingsApi.AccountDefaults;
import com.englms.shared.Ids;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * T-M2.3 G3 SEC-S4-6 and SEC-S4-7: the tutor reset hashes before locking; renames and resets are for students only.
 * T-M2.35 AC5: a new student account starts with the workspace defaults.
 */
class AccountServiceTest {

	static final Instant NOW = Instant.parse("2026-10-07T03:00:00Z");

	final UserAccountRepository accounts = mock(UserAccountRepository.class);

	final PasswordEncoder encoder = mock(PasswordEncoder.class);

	final SessionTerminator sessions = mock(SessionTerminator.class);

	final SettingsApi settings = mock(SettingsApi.class);

	AccountService service() {
		when(encoder.encode(anyString())).thenReturn("{bcrypt}hash");
		Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
		return new AccountService(accounts, sessions, encoder, new TemporaryPasswordGenerator(new SecureRandom()),
				new PasswordPolicy(), mock(ApplicationEventPublisher.class), new Ids(clock), clock, List.of("vi", "en"),
				settings);
	}

	@Test
	void theTutorResetEncodesBeforeTakingTheRowLock() {
		UUID id = UUID.randomUUID();
		when(accounts.findForUpdateById(id))
			.thenReturn(Optional.of(UserAccount.newStudent(id, "student.one", "{bcrypt}old", NOW, "vi", "Asia/Ho_Chi_Minh", NOW)));

		service().resetPasswordByTutor(id, UUID.randomUUID());

		InOrder order = inOrder(encoder, accounts);
		order.verify(encoder).encode(anyString());
		order.verify(accounts).findForUpdateById(id);
	}

	@Test
	void aTutorAccountCannotBeRenamedOrResetThroughTheStudentApi() {
		UUID id = UUID.randomUUID();
		UserAccount tutor = new UserAccount(id, "tutor.one", "{bcrypt}old", Role.TUTOR, NOW);
		when(accounts.findForUpdateById(id)).thenReturn(Optional.of(tutor));
		AccountService service = service();

		assertThatThrownBy(() -> service.changeUsername(id, "new.name")).isInstanceOf(NoSuchElementException.class);
		assertThatThrownBy(() -> service.resetPasswordByTutor(id, UUID.randomUUID()))
			.isInstanceOf(NoSuchElementException.class);

		assertThat(tutor.username()).isEqualTo("tutor.one");
		assertThat(tutor.passwordHash()).isEqualTo("{bcrypt}old");
		verify(accounts, never()).saveAndFlush(any());
		verify(sessions, never()).endAllSessions(any());
	}

	@Test
	void aNewStudentAccountTakesTheWorkspaceDefaults() {
		when(settings.accountDefaults()).thenReturn(new AccountDefaults("en", "Pacific/Kiritimati"));

		service().createStudentAccount("student.new", null);

		ArgumentCaptor<UserAccount> saved = ArgumentCaptor.forClass(UserAccount.class);
		verify(accounts).saveAndFlush(saved.capture());
		assertThat(saved.getValue().locale()).isEqualTo("en");
		assertThat(saved.getValue().timeZone()).isEqualTo("Pacific/Kiritimati");
	}

}
