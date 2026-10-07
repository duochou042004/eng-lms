-- T-M2.3: students module. The student row of a STUDENT account (data-model.md §2 students). No seed data.
-- search_text is computed by the application (identity.Usernames.normalize over the full name, email, phone and
-- contact-handle values, joined with spaces), like user_account.username_normalized; it replaces the designed
-- full_name_search generated column. started_on is deferred (no requirement uses it yet).

CREATE TABLE app.student
(
    id              uuid        NOT NULL,
    user_id         uuid        NOT NULL,
    full_name       text        NOT NULL,
    search_text     text        NOT NULL,
    email           text        NULL,
    phone           text        NULL,
    -- [{"label": text 1-60, "value": text 0-500}], at most 30 entries (validated in code).
    contact_handles jsonb       NOT NULL DEFAULT '[]',
    note            text        NULL,
    status          text        NOT NULL,
    created_at      timestamptz NOT NULL,
    updated_at      timestamptz NOT NULL,
    created_by      uuid        NULL,
    updated_by      uuid        NULL,
    version         bigint      NOT NULL DEFAULT 0,
    CONSTRAINT pk_student PRIMARY KEY (id),
    CONSTRAINT fk_student__user_id FOREIGN KEY (user_id) REFERENCES app.user_account (id) ON DELETE RESTRICT,
    CONSTRAINT ck_student__status CHECK (status IN ('ACTIVE', 'PAUSED', 'ARCHIVED'))
);

-- One student per account; also the lookup behind CurrentStudent (StudentPrincipals.studentIdForUser).
CREATE UNIQUE INDEX ux_student__user_id ON app.student (user_id);
CREATE INDEX ix_student__status ON app.student (status);
-- Substring search (LIKE '%q%') on the normalised text.
CREATE INDEX ix_student__search_text ON app.student USING gin (search_text app.gin_trgm_ops);
