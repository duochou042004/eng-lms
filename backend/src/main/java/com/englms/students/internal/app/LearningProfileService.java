package com.englms.students.internal.app;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.englms.shared.ProblemCodes;
import com.englms.shared.ProblemException;
import com.englms.shared.ProblemException.FieldProblem;
import com.englms.students.internal.domain.LearningProfile;
import com.englms.students.internal.domain.LearningProfileDetails;
import com.englms.students.internal.persistence.LearningProfileRepository;
import com.englms.students.internal.persistence.StudentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** A student's tutor-private learning profile (T-M2.9; FR-STU-04, A-008, DEC-103), for a student of any status. */
@Service
public class LearningProfileService {

	private final LearningProfileRepository profiles;

	private final StudentRepository students;

	private final Clock clock;

	LearningProfileService(LearningProfileRepository profiles, StudentRepository students, Clock clock) {
		this.profiles = profiles;
		this.students = students;
		this.clock = clock;
	}

	/** The stored profile, or the empty one ({@code version} {@code null}) while there is no row. */
	@Transactional(readOnly = true)
	public LearningProfileView get(UUID studentId) {
		requireStudent(studentId);
		return profiles.findById(studentId).map(LearningProfileView::of).orElse(LearningProfileView.EMPTY);
	}

	/**
	 * Replaces the profile. {@code version} {@code null} creates the row ({@code INSERT … ON CONFLICT DO NOTHING}); when
	 * a row exists already (another tab or request, or a later {@code null}) → 409 {@code STALE_VERSION}. A number must
	 * match the row's version (optimistic locking) → else 409.
	 */
	@Transactional
	public LearningProfileView put(UUID studentId, StudentCommands.LearningProfilePut command, UUID tutorId) {
		if (command.version() != null && command.version() < 0) {
			throw ProblemException.validation(
					List.of(StudentFields.problem("version", ProblemCodes.INVALID_VALUE, "0 or more")));
		}
		requireStudent(studentId);
		List<FieldProblem> problems = new ArrayList<>();
		LearningProfileDetails details = new LearningProfileDetails(
				StudentFields.optionalText(command.currentLevel(), "currentLevel", StudentFields.CURRENT_LEVEL_MAX,
						problems),
				StudentFields.optionalText(command.learningNotes(), "learningNotes", StudentFields.NOTE_MAX, problems),
				StudentFields.tags(command.strengths(), "strengths", problems),
				StudentFields.tags(command.weaknesses(), "weaknesses", problems),
				StudentFields.customFields(command.customFields(), problems));
		if (!problems.isEmpty()) {
			throw ProblemException.validation(problems);
		}
		Instant now = clock.instant();
		if (command.version() == null && profiles.insertEmptyIfAbsent(studentId, now, tutorId) == 0) {
			throw stale();
		}
		LearningProfile profile = profiles.findById(studentId)
			.filter(found -> command.version() == null || found.version() == command.version())
			.orElseThrow(LearningProfileService::stale);
		profile.apply(details, tutorId, now);
		profiles.flush();
		return LearningProfileView.of(profile);
	}

	private void requireStudent(UUID studentId) {
		if (!students.existsById(studentId)) {
			throw new ProblemException(HttpStatus.NOT_FOUND, ProblemCodes.NOT_FOUND);
		}
	}

	private static ProblemException stale() {
		return new ProblemException(HttpStatus.CONFLICT, ProblemCodes.STALE_VERSION);
	}

}
