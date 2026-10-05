-- T-M2.1: audit module v1 (NFR-SEC-11, security.md §8, data-model.md §2). Append-only: rows are inserted and, after
-- 365 days, deleted by the retention job; an UPDATE is rejected. No foreign keys: an audit row outlives its subject,
-- and an insert never waits for a lock held on the account row it describes.

CREATE TABLE app.audit_event
(
    id            uuid        NOT NULL,
    occurred_at   timestamptz NOT NULL,
    actor_user_id uuid        NULL,
    action        text        NOT NULL,
    subject_type  text        NULL,
    subject_id    uuid        NULL,
    ip            inet        NULL,
    user_agent    text        NULL,
    details       jsonb       NOT NULL DEFAULT '{}',
    CONSTRAINT pk_audit_event PRIMARY KEY (id)
);

CREATE INDEX ix_audit_event__occurred_at ON app.audit_event (occurred_at DESC);
CREATE INDEX ix_audit_event__action ON app.audit_event (action);

CREATE FUNCTION app.audit_event_reject_update() RETURNS trigger
    LANGUAGE plpgsql AS
$$
BEGIN
    RAISE EXCEPTION 'audit_event is append-only';
END
$$;

CREATE TRIGGER tr_audit_event__append_only
    BEFORE UPDATE ON app.audit_event
    FOR EACH ROW EXECUTE FUNCTION app.audit_event_reject_update();
