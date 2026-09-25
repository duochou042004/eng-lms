package com.englms.shared;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Time is always read from this {@link Clock} bean, never from {@code Instant.now()} (ArchitectureRulesTest).
 */
@Configuration(proxyBeanMethods = false)
public class SharedConfiguration {

	@Bean
	Clock clock() {
		return Clock.systemUTC();
	}

	@Bean
	Ids ids(Clock clock) {
		return new Ids(clock);
	}

}
