package com.englms.shared;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import org.junit.jupiter.api.Test;

class IdsTest {

	@Test
	void generatesVersion7UuidsCarryingTheClockTime() {
		Instant now = Instant.parse("2026-09-25T10:00:00Z");
		Ids ids = new Ids(Clock.fixed(now, ZoneOffset.UTC));

		UUID id = ids.newId();

		assertThat(id.version()).isEqualTo(7);
		assertThat(id.variant()).isEqualTo(2);
		assertThat(id.getMostSignificantBits() >>> 16).isEqualTo(now.toEpochMilli());
		assertThat(ids.newId()).isNotEqualTo(id);
	}

	@Test
	void idsAreOrderedByTime() {
		Ids earlier = new Ids(Clock.fixed(Instant.parse("2026-09-25T10:00:00Z"), ZoneOffset.UTC));
		Ids later = new Ids(Clock.fixed(Instant.parse("2026-09-25T10:00:01Z"), ZoneOffset.UTC));

		assertThat(later.newId().toString()).isGreaterThan(earlier.newId().toString());
	}

}
