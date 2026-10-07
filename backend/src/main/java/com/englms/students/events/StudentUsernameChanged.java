package com.englms.students.events;

import java.util.UUID;

public record StudentUsernameChanged(UUID studentId, UUID userId, UUID actorUserId) {
}
