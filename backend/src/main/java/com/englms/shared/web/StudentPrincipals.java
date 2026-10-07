package com.englms.shared.web;

import java.util.Optional;
import java.util.UUID;

/**
 * SPI for {@link CurrentStudentResolver}: the student ID of a user account, if it has a student row. The students
 * module implements it, so modules at the bottom of the graph can serve {@link CurrentStudent} handlers without
 * depending on {@code students} (same pattern as {@code FileAccessResolver}).
 */
public interface StudentPrincipals {

	Optional<UUID> studentIdForUser(UUID userId);

}
