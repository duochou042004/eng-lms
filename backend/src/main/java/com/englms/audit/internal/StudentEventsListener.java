package com.englms.audit.internal;

import java.util.Map;
import java.util.UUID;

import com.englms.audit.AuditAction;
import com.englms.audit.AuditApi;
import com.englms.audit.AuditEntry;
import com.englms.students.events.StudentCreated;
import com.englms.students.events.StudentStatusChanged;
import com.englms.students.events.StudentUsernameChanged;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Records the students events synchronously <em>after commit</em> ({@code @TransactionalEventListener}, default phase
 * {@code AFTER_COMMIT}; {@link AuditApi#record} writes in its own transaction): a rolled-back create or status change
 * leaves no row (T-M2.3). Not the asynchronous {@code @ApplicationModuleListener}, so tests stay deterministic (DEC-093).
 */
@Component
class StudentEventsListener {

	static final String STUDENT = "STUDENT";

	private final AuditApi audit;

	StudentEventsListener(AuditApi audit) {
		this.audit = audit;
	}

	@TransactionalEventListener
	void on(StudentCreated event) {
		record(AuditAction.STUDENT_CREATED, event.actorUserId(), event.studentId(), Map.of("userId", event.userId().toString()));
	}

	@TransactionalEventListener
	void on(StudentStatusChanged event) {
		record(AuditAction.STUDENT_STATUS_CHANGED, event.actorUserId(), event.studentId(),
				Map.of("from", event.from(), "to", event.to()));
	}

	@TransactionalEventListener
	void on(StudentUsernameChanged event) {
		record(AuditAction.USERNAME_CHANGED, event.actorUserId(), event.studentId(), Map.of("userId", event.userId().toString()));
	}

	private void record(AuditAction action, UUID actor, UUID studentId, Map<String, String> details) {
		audit.record(new AuditEntry(action, actor, STUDENT, studentId, null, null, details));
	}

}
