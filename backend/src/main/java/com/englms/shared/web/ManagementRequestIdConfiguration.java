package com.englms.shared.web;

import com.englms.shared.Ids;
import org.springframework.boot.actuate.autoconfigure.web.ManagementContextConfiguration;
import org.springframework.boot.actuate.autoconfigure.web.ManagementContextType;
import org.springframework.context.annotation.Bean;

/**
 * The management port (:8081) runs in a child context with its own servlet container, so the application's filter
 * beans don't apply there. This registers the request-ID filter (only) on it, so actuator responses carry
 * {@code X-Request-Id} and their Problem Details a {@code requestId} (api-conventions.md §7, T-M1.8 AC1).
 * The security headers stay on the application port (DEC-050). Loaded from
 * {@code META-INF/spring/…ManagementContextConfiguration.imports}.
 */
@ManagementContextConfiguration(value = ManagementContextType.CHILD, proxyBeanMethods = false)
class ManagementRequestIdConfiguration {

	@Bean
	RequestIdFilter managementRequestIdFilter(Ids ids) {
		return new RequestIdFilter(ids);
	}

}
