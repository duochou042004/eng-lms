package com.englms.settings.internal.web;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;

import com.englms.settings.internal.MetaProperties;
import com.englms.settings.internal.WorkspaceSettingsService;
import com.englms.shared.web.Audience;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public workspace metadata (api-catalog.md: {@code GET /api/v1/meta}). Public at the URL gate and through the
 * must-change gate (security.md §3, §4; DEC-089). {@code displayName} is the workspace store's effective name (T-M2.35):
 * one primary-key read per call, no cache.
 */
@RestController
@RequestMapping(path = "/api/v1", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "meta")
class MetaController {

	private final MetaProperties properties;

	private final WorkspaceSettingsService settings;

	MetaController(MetaProperties properties, WorkspaceSettingsService settings) {
		this.properties = properties;
		this.settings = settings;
	}

	@GetMapping("/meta")
	@Audience(Audience.Kind.PUBLIC)
	MetaResponse meta() {
		return new MetaResponse(properties.name(), properties.version(), List.copyOf(properties.locales()),
				settings.displayName());
	}

	@Schema(requiredProperties = { "name", "version", "locales", "displayName" })
	record MetaResponse(String name, String version, List<String> locales, String displayName) {
	}

}
