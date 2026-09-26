package com.englms.shared.web;

import java.time.Duration;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Static SPA files packaged under {@code classpath:/static/} by the image build (deployment.md §2). Hashed Vite
 * assets are cached for a year as immutable; everything else, {@code index.html} in particular, must revalidate.
 * Registering {@code /**} here replaces Boot's default static mapping.
 */
@Configuration(proxyBeanMethods = false)
class SpaWebConfiguration implements WebMvcConfigurer {

	static final String STATIC_LOCATION = "classpath:/static/";

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		registry.addResourceHandler("/assets/**")
			.addResourceLocations(STATIC_LOCATION + "assets/")
			.setCacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable());
		registry.addResourceHandler("/**").addResourceLocations(STATIC_LOCATION).setCacheControl(CacheControl.noCache());
	}

}
