-- T-M2.1: identity module. Accounts (data-model.md §2 identity), the Spring Session JDBC tables and the remember-me
-- tokens (ADR-0005, DEC-036). No seed data: the tutor is created at first start from the operator secret (FR-AUTH-02).

CREATE TABLE app.user_account
(
    id                       uuid        NOT NULL,
    username                 text        NOT NULL,
    -- lower(unaccent(trim(username))), computed by the application (identity.Usernames).
    username_normalized      text        NOT NULL,
    password_hash            text        NOT NULL,
    role                     text        NOT NULL,
    status                   text        NOT NULL,
    must_change_password     boolean     NOT NULL DEFAULT true,
    temp_password_expires_at timestamptz NULL,
    failed_login_count       integer     NOT NULL DEFAULT 0,
    locked_until             timestamptz NULL,
    last_login_at            timestamptz NULL,
    locale                   text        NOT NULL DEFAULT 'vi',
    time_zone                text        NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    display_name             text        NULL,
    created_at               timestamptz NOT NULL,
    updated_at               timestamptz NOT NULL,
    created_by               uuid        NULL,
    updated_by               uuid        NULL,
    version                  bigint      NOT NULL DEFAULT 0,
    CONSTRAINT pk_user_account PRIMARY KEY (id),
    CONSTRAINT ck_user_account__role CHECK (role IN ('TUTOR', 'STUDENT')),
    CONSTRAINT ck_user_account__status CHECK (status IN ('ACTIVE', 'DISABLED')),
    CONSTRAINT ck_user_account__failed_login_count CHECK (failed_login_count >= 0)
);

CREATE UNIQUE INDEX ux_user_account__username_normalized ON app.user_account (username_normalized);

-- I-01: exactly one tutor (ADR-0006). A second TUTOR row violates this index.
CREATE UNIQUE INDEX ux_user_account__single_tutor ON app.user_account ((role)) WHERE role = 'TUTOR';

-- Spring Session JDBC, copied from spring-session-jdbc-4.1.1.jar (org/springframework/session/jdbc/schema-postgresql.sql)
-- with the "app" schema prefix. spring.session.jdbc.initialize-schema=never: Flyway owns the tables. The repository uses the
-- unqualified default name SPRING_SESSION, which resolves through the connection's search path (spring.datasource.hikari.schema=app).
-- PRINCIPAL_NAME holds the user ID (never the username), so SessionTerminator finds every session of a user.
CREATE TABLE app.SPRING_SESSION (
	PRIMARY_ID CHAR(36) NOT NULL,
	SESSION_ID CHAR(36) NOT NULL,
	CREATION_TIME BIGINT NOT NULL,
	LAST_ACCESS_TIME BIGINT NOT NULL,
	MAX_INACTIVE_INTERVAL INT NOT NULL,
	EXPIRY_TIME BIGINT NOT NULL,
	PRINCIPAL_NAME VARCHAR(100),
	CONSTRAINT SPRING_SESSION_PK PRIMARY KEY (PRIMARY_ID)
);

CREATE UNIQUE INDEX SPRING_SESSION_IX1 ON app.SPRING_SESSION (SESSION_ID);
CREATE INDEX SPRING_SESSION_IX2 ON app.SPRING_SESSION (EXPIRY_TIME);
CREATE INDEX SPRING_SESSION_IX3 ON app.SPRING_SESSION (PRINCIPAL_NAME);

CREATE TABLE app.SPRING_SESSION_ATTRIBUTES (
	SESSION_PRIMARY_ID CHAR(36) NOT NULL,
	ATTRIBUTE_NAME VARCHAR(200) NOT NULL,
	ATTRIBUTE_BYTES BYTEA NOT NULL,
	CONSTRAINT SPRING_SESSION_ATTRIBUTES_PK PRIMARY KEY (SESSION_PRIMARY_ID, ATTRIBUTE_NAME),
	CONSTRAINT SPRING_SESSION_ATTRIBUTES_FK FOREIGN KEY (SESSION_PRIMARY_ID) REFERENCES app.SPRING_SESSION(PRIMARY_ID) ON DELETE CASCADE
);

-- Remember-me tokens: the columns JdbcTokenRepositoryImpl (Spring Security 7.1) reads and writes, as in its CREATE_TABLE_SQL.
-- "username" holds the user ID (the principal name). The index serves "delete every token of a user".
CREATE TABLE app.persistent_logins
(
    username  varchar(64) NOT NULL,
    series    varchar(64) NOT NULL,
    token     varchar(64) NOT NULL,
    last_used timestamp   NOT NULL,
    CONSTRAINT pk_persistent_logins PRIMARY KEY (series)
);

CREATE INDEX ix_persistent_logins__username ON app.persistent_logins (username);
