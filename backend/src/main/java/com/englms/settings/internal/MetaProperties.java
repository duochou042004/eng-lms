package com.englms.settings.internal;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Workspace metadata from configuration ({@code englms.meta.*}).
 */
@Validated
@ConfigurationProperties("englms.meta")
public record MetaProperties(@NotBlank String name, @NotBlank String version, @NotEmpty List<String> locales,
		@NotBlank String displayName) {
}
