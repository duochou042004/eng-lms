package com.englms.identity.internal.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

/** The sliding window (security.md §3) with a controlled clock. */
class LoginThrottleTest {

	static final Duration WINDOW = Duration.ofMinutes(5);

	static final class MutableClock extends Clock {

		Instant now = Instant.parse("2026-10-04T10:00:00Z");

		@Override
		public ZoneId getZone() {
			return ZoneOffset.UTC;
		}

		@Override
		public Clock withZone(ZoneId zone) {
			return this;
		}

		@Override
		public Instant instant() {
			return now;
		}

	}

	@Test
	void allows30AttemptsPerIpIn5MinutesThenAsksToRetryWhenTheOldestLeavesTheWindow() {
		MutableClock clock = new MutableClock();
		LoginThrottle throttle = new LoginThrottle(30, WINDOW, clock);
		Instant first = clock.now;
		for (int i = 0; i < 30; i++) {
			assertThat(throttle.tryAcquire("10.0.0.1")).isEmpty();
			clock.now = clock.now.plusSeconds(1);
		}

		assertThat(throttle.tryAcquire("10.0.0.1")).contains(Duration.between(clock.now, first.plus(WINDOW)));
		assertThat(throttle.tryAcquire("10.0.0.2")).as("other IPs are independent").isEmpty();

		clock.now = first.plus(WINDOW);
		assertThat(throttle.tryAcquire("10.0.0.1")).as("the first attempt left the window").isEmpty();
		assertThat(throttle.tryAcquire("10.0.0.1")).as("the second one has not").isPresent();
	}

	@Test
	void rejectedAttemptsDoNotExtendTheWindow() {
		MutableClock clock = new MutableClock();
		LoginThrottle throttle = new LoginThrottle(2, WINDOW, clock);
		throttle.tryAcquire("ip");
		throttle.tryAcquire("ip");
		for (int i = 0; i < 100; i++) {
			assertThat(throttle.tryAcquire("ip")).isPresent();
		}
		clock.now = clock.now.plus(WINDOW);
		assertThat(throttle.tryAcquire("ip")).isEmpty();
	}

	@Test
	void sweepsIdleIpsPastTheThreshold() {
		MutableClock clock = new MutableClock();
		LoginThrottle throttle = new LoginThrottle(30, WINDOW, clock);
		for (int i = 0; i <= LoginThrottle.SWEEP_THRESHOLD; i++) {
			throttle.tryAcquire("10.1." + i);
		}
		clock.now = clock.now.plus(WINDOW).plusSeconds(1);
		assertThat(throttle.trackedIps()).isGreaterThan(LoginThrottle.SWEEP_THRESHOLD);
		throttle.tryAcquire("10.2.0.1");
		assertThat(throttle.trackedIps()).isOne();
	}

}
