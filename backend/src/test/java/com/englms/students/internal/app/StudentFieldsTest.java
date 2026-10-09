package com.englms.students.internal.app;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.IntStream;

import org.junit.jupiter.api.Test;

import com.englms.shared.ProblemException.FieldProblem;
import com.englms.students.internal.domain.CustomField;
import com.englms.students.internal.domain.GuardianDetails;

/** T-M2.9 field rules (validation-rules "identity / students"): guardians, tags, custom fields. */
class StudentFieldsTest {

	final List<FieldProblem> problems = new ArrayList<>();

	List<String> codes() {
		return problems.stream().map(p -> p.field() + ":" + p.code()).toList();
	}

	@Test
	void tagsAreTrimmedAndDeduplicatedCaseInsensitivelyKeepingTheFirstSpelling() {
		assertThat(StudentFields.tags(List.of(" Speaking ", "SPEAKING", "Nghe", "nghe", "Đọc"), "strengths", problems))
			.containsExactly("Speaking", "Nghe", "Đọc");
		assertThat(problems).isEmpty();
	}

	@Test
	void tagsRefuseCommasBlanksLongOnesAndMoreThanThirtyAfterDeduplication() {
		StudentFields.tags(Arrays.asList("a,b", " ", null, "x".repeat(41), "x".repeat(40)), "weaknesses", problems);
		assertThat(codes()).containsExactly("weaknesses[0]:INVALID_FORMAT", "weaknesses[1]:REQUIRED",
				"weaknesses[2]:REQUIRED", "weaknesses[3]:TOO_LONG");

		problems.clear();
		StudentFields.tags(IntStream.range(0, 31).mapToObj(i -> "t" + i).toList(), "strengths", problems);
		assertThat(codes()).containsExactly("strengths:TOO_MANY");
	}

	/** T-M2.9 QA F1: a tag refuses every control character, also tab, LF, CR (even at the ends), DEL and C1. */
	@Test
	void tagsRefuseEveryControlCharacter() {
		List<String> tags = StudentFields.tags(List.of("a\tb", "line\n", "\rx", "del\u007f", "nel\u0085", "ok"), "strengths",
				problems);

		assertThat(tags).containsExactly("ok");
		assertThat(codes()).containsExactly("strengths[0]:INVALID_FORMAT", "strengths[1]:INVALID_FORMAT",
				"strengths[2]:INVALID_FORMAT", "strengths[3]:INVALID_FORMAT", "strengths[4]:INVALID_FORMAT");
	}

	/** T-M2.9 SEC S4-2: a huge list is one TOO_MANY, not one problem per entry. */
	@Test
	void aTagListFarBeyondTheLimitIsOneProblem() {
		assertThat(StudentFields.tags(Collections.nCopies(200_000, ""), "strengths", problems)).isEmpty();
		assertThat(codes()).containsExactly("strengths:TOO_MANY");
		problems.clear();
		StudentFields.tags(Collections.nCopies(120, "same"), "strengths", problems);
		assertThat(problems).as("4 x 30 entries are still deduplicated").isEmpty();
	}

	@Test
	void customFieldsFollowTheLabelValueRule() {
		List<CustomField> fields = StudentFields.customFields(
				List.of(new CustomField(" Goal ", null), new CustomField(null, "v"), new CustomField("l".repeat(61), "ok")),
				problems);

		assertThat(fields.get(0)).isEqualTo(new CustomField("Goal", ""));
		assertThat(codes()).containsExactly("customFields[1].label:REQUIRED", "customFields[2].label:TOO_LONG");
		problems.clear();
		StudentFields.customFields(Collections.nCopies(31, new CustomField("L", "v")), problems);
		assertThat(codes()).containsExactly("customFields:TOO_MANY");
	}

	@Test
	void aGuardianNeedsANameAndKeepsTheCommonContactRules() {
		GuardianDetails ok = StudentFields.guardian(new GuardianInput(" Mai ", " Mẹ ", "0901 234 567", "m@example.org", ""),
				"", problems);
		assertThat(ok).isEqualTo(new GuardianDetails("Mai", "Mẹ", "0901 234 567", "m@example.org", null));
		assertThat(problems).isEmpty();

		StudentFields.guardian(new GuardianInput(null, "r".repeat(41), "abc", "x@", "n".repeat(2001)), "guardians[3].",
				problems);
		assertThat(codes()).containsExactly("guardians[3].name:REQUIRED", "guardians[3].relationship:TOO_LONG",
				"guardians[3].phone:INVALID_FORMAT", "guardians[3].email:INVALID_FORMAT", "guardians[3].notes:TOO_LONG");
	}

	@Test
	void atMostTenGuardiansAtCreate() {
		assertThat(StudentFields.guardians(Collections.nCopies(10, new GuardianInput("G", null, null, null, null)), problems))
			.hasSize(10);
		assertThat(problems).isEmpty();
		StudentFields.guardians(Collections.nCopies(11, new GuardianInput("G", null, null, null, null)), problems);
		assertThat(codes()).containsExactly("guardians:TOO_MANY");
	}

}
