-- T-M2.9: guardians (FR-STU-03, A-005) and the tutor-private learning profile (FR-STU-04, A-008) of a student
-- (data-model.md §2 students). No seed data and no backfill: a student without a profile row has the empty profile.

-- Contact values of a student's guardians (no account, no portal). At most 10 per student (DEC-103, checked in code
-- under a row lock on the student); insertion order by position (data-model.md §1 ordering; positions not compacted).
CREATE TABLE app.student_guardian
(
    id           uuid        NOT NULL,
    student_id   uuid        NOT NULL,
    name         text        NOT NULL,
    relationship text        NULL,
    phone        text        NULL,
    email        text        NULL,
    notes        text        NULL,
    position     integer     NOT NULL,
    created_at   timestamptz NOT NULL,
    updated_at   timestamptz NOT NULL,
    created_by   uuid        NULL,
    updated_by   uuid        NULL,
    version      bigint      NOT NULL DEFAULT 0,
    CONSTRAINT pk_student_guardian PRIMARY KEY (id),
    CONSTRAINT fk_student_guardian__student_id FOREIGN KEY (student_id) REFERENCES app.student (id) ON DELETE CASCADE,
    CONSTRAINT ux_student_guardian__student_id_position UNIQUE (student_id, position) DEFERRABLE INITIALLY DEFERRED
);

-- At most one row per student; tutor-private (never mapped to a student DTO, NFR-SEC-02).
CREATE TABLE app.student_learning_profile
(
    student_id     uuid        NOT NULL,
    current_level  text        NULL,
    learning_notes text        NULL,
    -- Tags (1-40, no commas, case-insensitively deduplicated, at most 30; validated in code).
    strengths      text[]      NOT NULL DEFAULT '{}',
    weaknesses     text[]      NOT NULL DEFAULT '{}',
    -- [{"label": text 1-60, "value": text 0-500}], at most 30 entries (validated in code).
    custom_fields  jsonb       NOT NULL DEFAULT '[]',
    created_at     timestamptz NOT NULL,
    updated_at     timestamptz NOT NULL,
    created_by     uuid        NULL,
    updated_by     uuid        NULL,
    version        bigint      NOT NULL DEFAULT 0,
    CONSTRAINT pk_student_learning_profile PRIMARY KEY (student_id),
    CONSTRAINT fk_student_learning_profile__student_id FOREIGN KEY (student_id) REFERENCES app.student (id)
        ON DELETE CASCADE
);
