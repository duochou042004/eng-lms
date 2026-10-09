-- T-M2.9 (DEC-100 S4-5): a counter incremented with every password reset by someone else (the tutor's reset of a
-- student, the operator's reset of the tutor). A session or remember-me sign-in records it; a request whose stamp
-- differs from the account's is refused (AccountStatusFilter). The user's own password change leaves it unchanged.
ALTER TABLE app.user_account
    ADD COLUMN credential_stamp bigint NOT NULL DEFAULT 0;
