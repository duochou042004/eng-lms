package com.englms.students.internal.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** T-M2.3 test plan: transitions (domain-model §4.1), username suggestions, the search text. */
class StudentDomainTest {

	static final Instant NOW = Instant.parse("2026-10-07T03:00:00Z");

	@Test
	void transitionsFollowDomainModel41() {
		assertThat(StudentStatus.ACTIVE.canBecome(StudentStatus.PAUSED)).isTrue();
		assertThat(StudentStatus.PAUSED.canBecome(StudentStatus.ACTIVE)).isTrue();
		assertThat(StudentStatus.ACTIVE.canBecome(StudentStatus.ARCHIVED)).isTrue();
		assertThat(StudentStatus.PAUSED.canBecome(StudentStatus.ARCHIVED)).isTrue();
		assertThat(StudentStatus.ARCHIVED.canBecome(StudentStatus.ACTIVE)).isTrue();
		assertThat(StudentStatus.ARCHIVED.canBecome(StudentStatus.PAUSED)).isFalse();
		for (StudentStatus status : StudentStatus.values()) {
			assertThat(status.canBecome(status)).as(status.name()).isFalse();
		}
	}

	@Test
	void changeStatusReturnsThePreviousStatusAndRefusesAnInvalidTransition() {
		Student student = new Student(UUID.randomUUID(), UUID.randomUUID(),
				new StudentProfile("An", null, null, List.of(), null), UUID.randomUUID(), NOW);

		assertThat(student.status()).isEqualTo(StudentStatus.ACTIVE);
		assertThat(student.changeStatus(StudentStatus.ARCHIVED, null, NOW)).isEqualTo(StudentStatus.ACTIVE);
		assertThatThrownBy(() -> student.changeStatus(StudentStatus.PAUSED, null, NOW))
			.isInstanceOf(IllegalStateException.class);
		assertThat(student.status()).isEqualTo(StudentStatus.ARCHIVED);
	}

	@ParameterizedTest
	@CsvSource(delimiter = '|', value = { "Nguyễn Văn An|nguyenvanan", "Đặng Thị Đào|dangthidao", "  Lê   Hoàng 2  |lehoang2",
			"Anne-Marie O'Neil|annemarieoneil", "Bo|student", "李雷|student", "''|student", "Zoë 7|zoe7" })
	void theBaseIsTheNormalisedNameWithoutOtherCharacters(String fullName, String base) {
		assertThat(UsernameSuggestions.base(fullName)).isEqualTo(base);
	}

	@Test
	void aVeryLongNameIsTruncatedTo36AndASuffixStaysWithin40() {
		String name = "Abcdefghij".repeat(6);
		assertThat(UsernameSuggestions.base(name)).hasSize(36);
		Set<String> taken = Set.of(UsernameSuggestions.base(name), UsernameSuggestions.base(name) + "2");
		String suggestion = UsernameSuggestions.firstFree(name, taken::contains);
		assertThat(suggestion).isEqualTo(UsernameSuggestions.base(name) + "3").hasSizeLessThanOrEqualTo(40);
		assertThat(com.englms.identity.Usernames.isValid(suggestion)).isTrue();
	}

	@Test
	void theFirstFreeCandidateIsTakenInOrder() {
		assertThat(UsernameSuggestions.firstFree("Nguyễn Văn An", Set.of()::contains)).isEqualTo("nguyenvanan");
		assertThat(UsernameSuggestions.firstFree("Nguyễn Văn An", Set.of("nguyenvanan")::contains)).isEqualTo("nguyenvanan2");
		assertThat(UsernameSuggestions.firstFree("X", Set.of("student", "student2")::contains)).isEqualTo("student3");
	}

	@Test
	void theSearchTextNormalisesTheNameEmailPhoneAndHandleValuesButNotLabelsOrTheNote() {
		StudentProfile profile = new StudentProfile("Đặng Thị Mai", "Mai@Example.org", "+84 90",
				List.of(new ContactHandle("Zalo", "Thảo"), new ContactHandle("Facebook", "")), "Secret note");

		assertThat(Student.searchText(profile)).isEqualTo("dang thi mai mai@example.org +84 90 thao");
	}

}
