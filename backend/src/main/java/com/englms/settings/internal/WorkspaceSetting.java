package com.englms.settings.internal;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** A row of {@code workspace_setting} (data-model.md §2 settings): seeded by the migration, never inserted or deleted by the app. */
@Entity
@Table(name = "workspace_setting")
class WorkspaceSetting {

	static final String WORKSPACE = "workspace";

	@Id
	private String key;

	@JdbcTypeCode(SqlTypes.JSON)
	private WorkspaceDocument value;

	@Version
	private long version;

	private Instant updatedAt;

	private UUID updatedBy;

	protected WorkspaceSetting() {
	}

	/** Replaces the document unless it equals the stored one (then nothing is written: version, updatedAt and updatedBy stay). */
	void apply(WorkspaceDocument document, UUID actor, Instant now) {
		if (document.equals(value)) {
			return;
		}
		value = document;
		updatedAt = now;
		updatedBy = actor;
	}

	WorkspaceDocument value() {
		return value;
	}

	long version() {
		return version;
	}

	Instant updatedAt() {
		return updatedAt;
	}

}
