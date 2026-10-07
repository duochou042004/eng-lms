package com.englms.students;

import java.util.Optional;
import java.util.UUID;

/** Read access to students for other modules. */
public interface StudentDirectory {

	/**
	 * @throws com.englms.shared.ProblemException 404 {@code NOT_FOUND} for an unknown student
	 */
	StudentRef require(UUID studentId);

	Optional<UUID> studentIdForUser(UUID userId);

	record StudentRef(UUID studentId, UUID userId, String fullName) {
	}

}
