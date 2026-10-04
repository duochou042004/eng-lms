package com.englms.identity;

import java.util.UUID;

/**
 * Account commands for other modules. {@link #disable} ends every session and remember-me token of the user at once
 * (FR-AUTH-10, A-018); the students module uses both for archive and reactivation (T-M2.3).
 */
public interface AccountApi {

	void disable(UUID userId);

	void enable(UUID userId);

}
