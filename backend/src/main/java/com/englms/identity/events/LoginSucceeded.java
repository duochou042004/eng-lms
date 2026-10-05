package com.englms.identity.events;

import java.util.UUID;

public record LoginSucceeded(UUID userId, ClientInfo client) {
}
