package com.englms.audit.internal;

import java.util.Map;
import java.util.UUID;

import com.englms.audit.AuditAction;
import com.englms.audit.AuditApi;
import com.englms.audit.AuditEntry;
import com.englms.identity.events.AccountLocked;
import com.englms.identity.events.ClientInfo;
import com.englms.identity.events.LoginFailed;
import com.englms.identity.events.LoginSucceeded;
import com.englms.identity.events.PasswordChanged;
import com.englms.identity.events.PasswordReset;
import com.englms.identity.events.TutorBootstrapped;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Records the identity events synchronously ({@code @EventListener}, not after commit): {@link AuditApi#record}
 * writes in its own transaction ({@code REQUIRES_NEW}), so a failed-login row survives the failed request
 * (module-boundaries.md §audit "Listens", T-M2.1).
 */
@Component
class IdentityEventsListener {

	static final String USER_ACCOUNT = "USER_ACCOUNT";

	private final AuditApi audit;

	IdentityEventsListener(AuditApi audit) {
		this.audit = audit;
	}

	@EventListener
	void on(LoginSucceeded event) {
		record(AuditAction.LOGIN_SUCCEEDED, event.userId(), event.userId(), event.client(), Map.of());
	}

	@EventListener
	void on(LoginFailed event) {
		record(AuditAction.LOGIN_FAILED, null, event.userId(), event.client(), Map.of("reason", event.reason().name()));
	}

	@EventListener
	void on(AccountLocked event) {
		record(AuditAction.ACCOUNT_LOCKED, null, event.userId(), event.client(),
				Map.of("lockedUntil", event.lockedUntil().toString()));
	}

	@EventListener
	void on(PasswordChanged event) {
		record(AuditAction.PASSWORD_CHANGED, event.userId(), event.userId(), event.client(), Map.of());
	}

	@EventListener
	void on(PasswordReset event) {
		AuditAction action = (event.actor() == PasswordReset.Actor.OPERATOR) ? AuditAction.PASSWORD_RESET_BY_OPERATOR
				: AuditAction.PASSWORD_RESET_BY_TUTOR;
		record(action, event.actorUserId(), event.userId(), ClientInfo.NONE, Map.of());
	}

	@EventListener
	void on(TutorBootstrapped event) {
		record(AuditAction.BOOTSTRAP_TUTOR_CREATED, null, event.userId(), ClientInfo.NONE, Map.of());
	}

	private void record(AuditAction action, UUID actor, UUID subject, ClientInfo client, Map<String, String> details) {
		audit.record(new AuditEntry(action, actor, (subject != null) ? USER_ACCOUNT : null, subject, client.ip(),
				client.userAgent(), details));
	}

}
