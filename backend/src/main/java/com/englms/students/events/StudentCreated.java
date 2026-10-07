package com.englms.students.events;

import java.util.UUID;

public record StudentCreated(UUID studentId, UUID userId, UUID actorUserId) {
}
