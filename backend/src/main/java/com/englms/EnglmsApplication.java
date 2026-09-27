package com.englms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.actuate.autoconfigure.web.ManagementContextConfiguration;
import org.springframework.boot.autoconfigure.AutoConfigurationExcludeFilter;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.TypeExcludeFilter;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.ComponentScan.Filter;
import org.springframework.context.annotation.FilterType;

/**
 * The application root. Management-context configurations (loaded only into the management port's child context from
 * {@code META-INF/spring/…ManagementContextConfiguration.imports}) must not be component-scanned: scanned, they would
 * also register their beans on the application port, and the request-ID filter ran twice on :8080 (T-M1.8 SEC review
 * S3-1, DEC-050). The local {@code @ComponentScan} replaces the one inside {@code @SpringBootApplication} (a locally
 * declared scan takes precedence over a meta-annotation), keeps Boot's two default exclude filters and adds that one.
 * Spring Modulith needs the {@code @SpringBootApplication} annotation itself, so it isn't spelled out.
 */
@SpringBootApplication
@ComponentScan(excludeFilters = { @Filter(type = FilterType.CUSTOM, classes = TypeExcludeFilter.class),
		@Filter(type = FilterType.CUSTOM, classes = AutoConfigurationExcludeFilter.class),
		@Filter(type = FilterType.ANNOTATION, classes = ManagementContextConfiguration.class) })
public class EnglmsApplication {

	public static void main(String[] args) {
		SpringApplication.run(EnglmsApplication.class, args);
	}

}
