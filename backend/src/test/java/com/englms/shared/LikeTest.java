package com.englms.shared;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class LikeTest {

	@Test
	void escapesTheWildcardsAndTheEscapeCharacter() {
		assertThat(Like.contains("a%b_c\\d")).isEqualTo("%a\\%b\\_c\\\\d%");
		assertThat(Like.contains("plain")).isEqualTo("%plain%");
	}

}
