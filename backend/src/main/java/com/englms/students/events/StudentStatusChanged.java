package com.englms.students.events;

import java.util.UUID;

/** {@code from} and {@code to} are status names ({@code ACTIVE}, {@code PAUSED}, {@code ARCHIVED}). */
public record StudentStatusChanged(UUID studentId, UUID userId, String from, String to, UUID actorUserId) {
}
