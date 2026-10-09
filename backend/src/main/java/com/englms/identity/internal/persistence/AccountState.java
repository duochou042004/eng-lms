package com.englms.identity.internal.persistence;

import com.englms.identity.internal.domain.AccountStatus;

/** What the per-request account check reads (SEC S4-1 status, S4-5 credential stamp). */
public record AccountState(AccountStatus status, long credentialStamp) {
}
