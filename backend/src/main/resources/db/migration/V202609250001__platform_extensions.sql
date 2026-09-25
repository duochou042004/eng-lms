-- V1 (T-M1.2): platform extensions, the text-search configuration and the Spring Modulith event publication registry.
-- No domain tables and no seed data (data-model.md §4). Spring Session / persistent_logins arrive with T-M2.1 (DEC-036).

-- The "app" schema itself is created by Flyway before this script runs (spring.flyway.schemas=app), so that the
-- schema history table can live in it.

-- Both extensions are trusted (PostgreSQL 13+), so the database owner can create them.
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA app;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA app;

-- Accent-insensitive "simple" configuration for Vietnamese and English search (data-model.md §1).
CREATE TEXT SEARCH CONFIGURATION app.simple_unaccent (COPY = pg_catalog.simple);
ALTER TEXT SEARCH CONFIGURATION app.simple_unaccent
    ALTER MAPPING FOR hword, hword_part, word WITH app.unaccent, pg_catalog.simple;

-- Spring Modulith 2.1 JDBC event publication registry, copied from the schema shipped in
-- spring-modulith-events-jdbc-2.1.1.jar (schemas/v2/schema-postgresql.sql). The starter does not create it
-- (spring.modulith.events.jdbc.schema-initialization.enabled defaults to false), so Flyway owns it.
CREATE TABLE app.event_publication
(
    id                     UUID                     NOT NULL,
    listener_id            TEXT                     NOT NULL,
    event_type             TEXT                     NOT NULL,
    serialized_event       TEXT                     NOT NULL,
    publication_date       TIMESTAMP WITH TIME ZONE NOT NULL,
    completion_date        TIMESTAMP WITH TIME ZONE,
    status                 TEXT,
    completion_attempts    INT,
    last_resubmission_date TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (id)
);
CREATE INDEX event_publication_serialized_event_hash_idx ON app.event_publication USING hash (serialized_event);
CREATE INDEX event_publication_by_completion_date_idx ON app.event_publication (completion_date);
