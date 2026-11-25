package com.englms.shared;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.OptionalInt;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** T-M2.33 AC4 (DEC-200 (2)): the shared name rule; the API tables are in {@code NameRuleApiTest}. */
class NamesTest {

	@ParameterizedTest(name = "U+{0}")
	@ValueSource(ints = { 0x0000, 0x0009, 0x000A, 0x000D, 0x001F, 0x007F, 0x0085, 0x009F, 0x00AD, 0x061C, 0x180E, 0x200B,
			0x200C, 0x200D, 0x200E, 0x200F, 0x2028, 0x2029, 0x202A, 0x202E, 0x2060, 0x2064, 0x2066, 0x2069, 0xFEFF, 0xE0001,
			0xE0020, 0xE0041, 0xE007F, 0xD800, 0xDFFF })
	void aForbiddenCodePointIsFoundAtTheStartMiddleAndEnd(int codePoint) {
		String c = Character.toString(codePoint);

		for (String name : new String[] { c + "Lan", "La" + c + "n", "Lan" + c }) {
			assertThat(Names.firstForbidden(name)).as(Names.codePoint(codePoint)).isEqualTo(OptionalInt.of(codePoint));
		}
	}

	@Test
	void theFirstForbiddenCodePointIsReturnedWholeNotItsSurrogates() {
		assertThat(Names.firstForbidden("A​B‮")).hasValue(0x200B);
		assertThat(Names.firstForbidden("Lan󠁁​")).hasValue(0xE0041);
		assertThat(Names.firstForbidden("\uDBFF")).hasValue(0xDBFF);
	}

	@ParameterizedTest
	@ValueSource(strings = { "Lớp cô Lan", "Lé Lan", "Lan ❤️", "Ms Lan", " Lan　", "" })
	void marksEmojiAndSpacesAreAllowed(String name) {
		assertThat(Names.firstForbidden(name)).isEmpty();
	}

	@Test
	void stripRemovesWhitespaceAndSpaceSeparatorsAtBothEndsOnly() {
		assertThat(Names.strip(" Lan ")).isEqualTo("Lan");
		assertThat(Names.strip("  　Lan Anh  ")).isEqualTo("Lan Anh");
		assertThat(Names.strip("Lan")).isEqualTo("Lan");
	}

	@Test
	void onlySpaceSeparatorsOrWhitespaceIsBlank() {
		assertThat(Names.isBlank("")).isTrue();
		assertThat(Names.isBlank("   ")).isTrue();
		assertThat(Names.isBlank(" ")).isTrue();
		assertThat(Names.isBlank("　  ")).isTrue();
		assertThat(Names.isBlank(" a ")).isFalse();
	}

	@Test
	void aCodePointIsWrittenUpperCaseWithFourToSixDigits() {
		assertThat(Names.codePoint(0x9)).isEqualTo("U+0009");
		assertThat(Names.codePoint(0x200B)).isEqualTo("U+200B");
		assertThat(Names.codePoint(0xE0041)).isEqualTo("U+E0041");
		assertThat(Names.codePoint(0x10FFFF)).isEqualTo("U+10FFFF");
	}

}
