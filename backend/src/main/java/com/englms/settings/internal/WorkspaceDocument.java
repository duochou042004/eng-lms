package com.englms.settings.internal;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * The {@code workspace} row's {@code value} (data-model.md §2 settings): {@code displayName} {@code null} (absent in
 * the document) means the configured {@code englms.meta.display-name}.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record WorkspaceDocument(String displayName, String defaultLocale, String defaultTimeZone) {
}
