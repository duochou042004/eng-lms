package com.englms.students.internal.app;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import com.englms.identity.AccountApi;
import com.englms.shared.Ids;
import com.englms.students.internal.domain.Student;
import com.englms.students.internal.domain.StudentProfile;
import com.englms.students.internal.persistence.StudentRepository;
import org.springframework.context.ApplicationEventPublisher;

/**
 * T-M2.16 AC3/AC5 (ii): the forced version increment runs once, after the account rename, and only when the profile
 * part changed nothing. Over HTTP a second increment is invisible (Hibernate skips a force increment on an entity
 * already flushed in WRITE mode), so the {@code apply} guard is proved here.
 */
class StudentServiceVersionTest {

	final Clock clock = Clock.fixed(Instant.parse("2026-10-07T03:00:00Z"), ZoneOffset.UTC);

	final StudentRepository students = mock(StudentRepository.class);

	final AccountApi accounts = mock(AccountApi.class);

	final StudentService service = new StudentService(students, accounts, mock(ApplicationEventPublisher.class),
			new Ids(clock), clock, mock(GuardianService.class));

	final Student student = new Student(UUID.randomUUID(), UUID.randomUUID(),
			new StudentProfile("An", null, null, List.of(), null), UUID.randomUUID(), clock.instant());

	StudentServiceVersionTest() {
		when(students.findById(student.id())).thenReturn(Optional.of(student));
		when(accounts.usernames(any())).thenReturn(Map.of(student.userId(), "old.name"));
	}

	void update(Optional<String> note, Optional<String> username) {
		service.update(student.id(), new StudentCommands.Update(0L, null, username, null, null, null, note),
				UUID.randomUUID());
	}

	@Test
	void aUsernameOnlyChangeForcesTheIncrementAfterTheAccountRename() {
		update(null, Optional.of("new.name"));

		InOrder order = inOrder(accounts, students);
		order.verify(accounts).changeUsername(student.userId(), "new.name");
		order.verify(students).forceVersionIncrement(student);
	}

	@Test
	void aProfileAndUsernameChangeLeavesTheIncrementToTheRowUpdate() {
		update(Optional.of("x"), Optional.of("new.name"));

		verify(accounts).changeUsername(student.userId(), "new.name");
		verify(students, never()).forceVersionIncrement(any());
	}

	@Test
	void theSameUsernameForcesNothing() {
		update(null, Optional.of(" old.name "));

		verify(accounts, never()).changeUsername(any(), any());
		verify(students, never()).forceVersionIncrement(any());
	}

}
