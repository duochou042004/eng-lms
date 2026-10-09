package com.englms.students.internal.domain;

import java.util.List;

import com.englms.shared.web.TutorPrivate;

/** The learning profile's values, already validated and normalised (FR-STU-04); tutor-private (A-008). */
@TutorPrivate
public record LearningProfileDetails(String currentLevel, String learningNotes, List<String> strengths,
		List<String> weaknesses, List<CustomField> customFields) {

	public static final LearningProfileDetails EMPTY = new LearningProfileDetails(null, null, null, null, null);

	public LearningProfileDetails {
		strengths = (strengths != null) ? List.copyOf(strengths) : List.of();
		weaknesses = (weaknesses != null) ? List.copyOf(weaknesses) : List.of();
		customFields = (customFields != null) ? List.copyOf(customFields) : List.of();
	}

	@Override
	public String toString() {
		return "LearningProfileDetails[]";
	}

}
