package com.englms.students.internal.app;

import java.time.Instant;
import java.util.List;

import com.englms.shared.web.TutorPrivate;
import com.englms.students.internal.domain.CustomField;
import com.englms.students.internal.domain.LearningProfile;
import com.englms.students.internal.domain.LearningProfileDetails;

/**
 * A student's learning profile for the tutor (FR-STU-04); tutor-private. A student never edited has the empty
 * profile: {@code updatedAt} and {@code version} {@code null} (DEC-103).
 */
@TutorPrivate
public record LearningProfileView(String currentLevel, String learningNotes, List<String> strengths,
		List<String> weaknesses, List<CustomField> customFields, Instant updatedAt, Long version) {

	static final LearningProfileView EMPTY = of(LearningProfileDetails.EMPTY, null, null);

	static LearningProfileView of(LearningProfile profile) {
		return of(profile.details(), profile.updatedAt(), profile.version());
	}

	private static LearningProfileView of(LearningProfileDetails details, Instant updatedAt, Long version) {
		return new LearningProfileView(details.currentLevel(), details.learningNotes(), details.strengths(),
				details.weaknesses(), details.customFields(), updatedAt, version);
	}

	@Override
	public String toString() {
		return "LearningProfileView[version=" + version + "]";
	}

}
