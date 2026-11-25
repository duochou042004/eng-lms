-- T-M2.35 (FR-SET-01, DEC-193): the workspace settings store (data-model.md §2 settings). One document per key,
-- validated in code; the app never inserts or deletes a row. The structural row 'workspace' starts with the
-- user_account column defaults of V202610040001; no displayName property = the configured englms.meta.display-name.
CREATE TABLE app.workspace_setting
(
    key        text        NOT NULL,
    -- 'workspace': {"displayName"?: text 1-120, "defaultLocale": one of englms.meta.locales, "defaultTimeZone": a java.time zone ID}
    value      jsonb       NOT NULL,
    version    bigint      NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL,
    updated_by uuid        NULL,
    CONSTRAINT pk_workspace_setting PRIMARY KEY (key)
);

INSERT INTO app.workspace_setting (key, value, updated_at)
VALUES ('workspace', '{"defaultLocale": "vi", "defaultTimeZone": "Asia/Ho_Chi_Minh"}', now());
