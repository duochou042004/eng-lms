package com.englms.shared.web;

import java.util.UUID;

/**
 * The signed-in student (ADR-0016 §2). {@code ..web.student..} handlers declare a {@code CurrentStudent me} parameter
 * instead of any student ID; {@link CurrentStudentResolver} fills it from the session principal, never from the
 * request. Owner-scoped reads use it: {@code findByIdAndStudentId(id, me.studentId())}, a mismatch is a 404.
 */
public record CurrentStudent(UUID studentId, UUID userId) {
}
