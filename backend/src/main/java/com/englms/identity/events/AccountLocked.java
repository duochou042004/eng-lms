package com.englms.identity.events;

import java.time.Instant;
import java.util.UUID;

public record AccountLocked(UUID userId, Instant lockedUntil, ClientInfo client) {
}
