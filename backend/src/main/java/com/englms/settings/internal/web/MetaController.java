package com.englms.settings.internal.web;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;

import com.englms.settings.internal.MetaProperties;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public workspace metadata (api-catalog.md: {@code GET /api/v1/meta}). Public at the URL gate and through the
 * must-change gate (security.md §3, §4; DEC-089).
 */
@RestController
@RequestMapping(path = "/api/v1", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "meta")
class MetaController {

	private final MetaProperties properties;

	MetaController(MetaProperties properties) {
		this.properties = properties;
	}

	@GetMapping("/meta")
	MetaResponse meta() {
		return new MetaResponse(properties.name(), properties.version(), List.copyOf(properties.locales()),
				properties.displayName());
	}

	@Schema(requiredProperties = { "name", "version", "locales", "displayName" })
	record MetaResponse(String name, String version, List<String> locales, String displayName) {
	}

}
