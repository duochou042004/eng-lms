package com.englms.identity.events;

import java.util.UUID;

public record PasswordChanged(UUID userId, ClientInfo client) {
}
