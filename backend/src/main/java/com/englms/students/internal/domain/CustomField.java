package com.englms.students.internal.domain;

import com.englms.shared.web.TutorPrivate;

/** A tutor-labelled value of the learning profile ("Goal score", "Preferred topics", … are examples, not an enum). */
@TutorPrivate
public record CustomField(String label, String value) {
}
