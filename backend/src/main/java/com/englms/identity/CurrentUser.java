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
 * <p>
 * {@code credentialStamp} is the account's {@code credential_stamp} when this sign-in read it (T-M2.9, DEC-100 S4-5):
 * a request whose stamp differs from the account's is refused. A session stored before the component existed reads
 * back with 0 (Java record deserialisation defaults a missing component; same {@code serialVersionUID}), the column
 * default. It never appears in a response or a log ({@link #toString()}).
 */
public record CurrentUser(UUID userId, Role role, boolean mustChangePassword, long credentialStamp)
		implements AuthenticatedPrincipal, Serializable {

	@Serial
	private static final long serialVersionUID = 1L;

	@Override
	public String toString() {
		return "CurrentUser[userId=" + userId + ", role=" + role + ", mustChangePassword=" + mustChangePassword + "]";
	}

	@Override
	public String getName() {
		return userId.toString();
	}

}
