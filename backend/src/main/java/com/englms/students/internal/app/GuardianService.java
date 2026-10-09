package com.englms.students.internal.app;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.englms.shared.Ids;
import com.englms.shared.ProblemCodes;
import com.englms.shared.ProblemException;
import com.englms.shared.ProblemException.FieldProblem;
import com.englms.students.internal.domain.Guardian;
import com.englms.students.internal.domain.GuardianDetails;
import com.englms.students.internal.persistence.GuardianRepository;
import com.englms.students.internal.persistence.StudentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * A student's guardians (T-M2.9; FR-STU-03, A-005, DEC-103): at most {@value StudentFields#GUARDIANS_MAX}, listed in
 * insertion order, for a student of any status.
 */
@Service
public class GuardianService {

	private final GuardianRepository guardians;

	private final StudentRepository students;

	private final Ids ids;

	private final Clock clock;

	GuardianService(GuardianRepository guardians, StudentRepository students, Ids ids, Clock clock) {
		this.guardians = guardians;
		this.students = students;
		this.ids = ids;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public List<GuardianView> list(UUID studentId) {
		if (!students.existsById(studentId)) {
			throw notFound();
		}
		return guardians.findByStudentIdInOrder(studentId).stream().map(GuardianView::of).toList();
	}

	/**
	 * Locks the student row first ({@code SELECT … FOR UPDATE}), so two concurrent appends can neither exceed the cap nor
	 * share a position: the second counts after the first commits.
	 */
	@Transactional
	public GuardianView add(UUID studentId, GuardianInput input, UUID tutorId) {
		students.findForUpdateById(studentId).orElseThrow(GuardianService::notFound);
		List<FieldProblem> problems = new ArrayList<>();
		GuardianDetails details = StudentFields.guardian(input, "", problems);
		if (!problems.isEmpty()) {
			throw ProblemException.validation(problems);
		}
		if (guardians.countByStudentId(studentId) >= StudentFields.GUARDIANS_MAX) {
			throw ProblemException.validation(List.of(StudentFields.problem("guardians", ProblemCodes.TOO_MANY,
					"At most " + StudentFields.GUARDIANS_MAX + " guardians")));
		}
		Guardian guardian = guardians.saveAndFlush(new Guardian(ids.newId(), studentId,
				guardians.maxPosition(studentId) + 1, details, tutorId, clock.instant()));
		return GuardianView.of(guardian);
	}

	/** The guardians of a student being created (FR-STU-01), already validated, in request order. */
	void addAll(UUID studentId, List<GuardianDetails> details, UUID tutorId) {
		List<Guardian> created = new ArrayList<>();
		for (int i = 0; i < details.size(); i++) {
			created.add(new Guardian(ids.newId(), studentId, i + 1, details.get(i), tutorId, clock.instant()));
		}
		guardians.saveAllAndFlush(created);
	}

	@Transactional
	public GuardianView update(UUID guardianId, StudentCommands.GuardianUpdate command, UUID tutorId) {
		if (command.version() == null || command.version() < 0) {
			throw ProblemException.validation(List.of((command.version() == null)
					? StudentFields.problem("version", ProblemCodes.REQUIRED, "The version read with the guardian")
					: StudentFields.problem("version", ProblemCodes.INVALID_VALUE, "0 or more")));
		}
		Guardian guardian = guardians.findById(guardianId).orElseThrow(GuardianService::notFound);
		if (guardian.version() != command.version()) {
			throw new ProblemException(HttpStatus.CONFLICT, ProblemCodes.STALE_VERSION);
		}
		GuardianDetails current = guardian.details();
		GuardianInput merged = new GuardianInput(
				(command.name() == null) ? current.name() : command.name().orElse(null),
				(command.relationship() == null) ? current.relationship() : command.relationship().orElse(null),
				(command.phone() == null) ? current.phone() : command.phone().orElse(null),
				(command.email() == null) ? current.email() : command.email().orElse(null),
				(command.notes() == null) ? current.notes() : command.notes().orElse(null));
		List<FieldProblem> problems = new ArrayList<>();
		GuardianDetails details = StudentFields.guardian(merged, "", problems);
		if (!problems.isEmpty()) {
			throw ProblemException.validation(problems);
		}
		guardian.apply(details, tutorId, clock.instant());
		guardians.flush();
		return GuardianView.of(guardian);
	}

	/** Positions are not compacted (DEC-103). */
	@Transactional
	public void delete(UUID guardianId) {
		guardians.delete(guardians.findById(guardianId).orElseThrow(GuardianService::notFound));
	}

	private static ProblemException notFound() {
		return new ProblemException(HttpStatus.NOT_FOUND, ProblemCodes.NOT_FOUND);
	}

}
