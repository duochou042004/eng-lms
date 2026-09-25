package com.englms.shared;

import java.security.SecureRandom;
import java.time.Clock;
import java.util.UUID;

/**
 * Generates the application-side primary keys: RFC 9562 UUIDv7 (time-ordered), per data-model.md §1.
 */
public class Ids {

	private final Clock clock;

	private final SecureRandom random = new SecureRandom();

	public Ids(Clock clock) {
		this.clock = clock;
	}

	public UUID newId() {
		long millis = clock.millis();
		long randA = random.nextInt() & 0xFFFL;
		long randB = random.nextLong() & 0x3FFF_FFFF_FFFF_FFFFL;
		long msb = (millis & 0xFFFF_FFFF_FFFFL) << 16 | 0x7000L | randA;
		long lsb = 0x8000_0000_0000_0000L | randB;
		return new UUID(msb, lsb);
	}

}
