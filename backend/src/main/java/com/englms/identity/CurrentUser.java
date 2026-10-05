package com.englms.identity;

import java.io.Serial;
import java.io.Serializable;
import java.util.UUID;

import org.springframework.security.core.AuthenticatedPrincipal;

/**
 * The authenticated principal, stored in the server-side session. Its name is the stable user ID, never the
 * username: it is the Spring Session principal-name index and the remember-me token owner, so
 * {@link SessionTerminator#endAllSessions} finds every session and token of a user (T-M2.1 design notes).
 * Handlers receive it with {@code @AuthenticationPrincipal CurrentUser me}.
 */
public record CurrentUser(UUID userId, Role role, boolean mustChangePassword) implements AuthenticatedPrincipal, Serializable {

	@Serial
	private static final long serialVersionUID = 1L;

	@Override
	public String getName() {
		return userId.toString();
	}

}
