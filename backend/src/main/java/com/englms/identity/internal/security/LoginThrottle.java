package com.englms.identity.internal.security;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * The per-IP sign-in throttle (security.md §3, NFR-SEC-05): a sliding window of the accepted attempts per client IP.
 * In memory and instance-local, which is adequate for the single instance of ADR-0012.
 */
public class LoginThrottle {

	/** ponytail: past this many tracked IPs, idle ones are swept on the next attempt; a store only if ever multi-instance. */
	static final int SWEEP_THRESHOLD = 10_000;

	private final Map<String, Deque<Instant>> attempts = new ConcurrentHashMap<>();

	private final int maxAttempts;

	private final Duration window;

	private final Clock clock;

	public LoginThrottle(int maxAttempts, Duration window, Clock clock) {
		this.maxAttempts = maxAttempts;
		this.window = window;
		this.clock = clock;
	}

	int trackedIps() {
		return attempts.size();
	}

	/**
	 * Records an attempt from {@code ip}.
	 * @return empty when the attempt may proceed, otherwise how long until the next one is allowed
	 */
	public Optional<Duration> tryAcquire(String ip) {
		Instant now = clock.instant();
		Instant floor = now.minus(window);
		if (attempts.size() > SWEEP_THRESHOLD) {
			attempts.values().removeIf(times -> {
				synchronized (times) {
					return times.isEmpty() || !times.peekLast().isAfter(floor);
				}
			});
		}
		Deque<Instant> times = attempts.computeIfAbsent(String.valueOf(ip), key -> new ArrayDeque<>());
		synchronized (times) {
			while (!times.isEmpty() && !times.peekFirst().isAfter(floor)) {
				times.pollFirst();
			}
			if (times.size() >= maxAttempts) {
				Duration wait = Duration.between(now, times.peekFirst().plus(window));
				return Optional.of(wait.isNegative() || wait.isZero() ? Duration.ofSeconds(1) : wait);
			}
			times.addLast(now);
			return Optional.empty();
		}
	}

}
