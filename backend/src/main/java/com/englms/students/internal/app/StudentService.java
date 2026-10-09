package com.englms.students.internal.app;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.criteria.Predicate;

import com.englms.identity.AccountApi;
import com.englms.identity.AccountApi.TemporaryCredentials;
import com.englms.identity.AccountApi.UsernameCheck;
import com.englms.identity.Usernames;
import com.englms.shared.Ids;
import com.englms.shared.Like;
import com.englms.shared.ProblemCodes;
import com.englms.shared.ProblemException;
import com.englms.shared.ProblemException.FieldProblem;
import com.englms.shared.web.StudentPrincipals;
import com.englms.students.StudentDirectory;
import com.englms.students.events.StudentCreated;
import com.englms.students.events.StudentStatusChanged;
import com.englms.students.events.StudentUsernameChanged;
import com.englms.students.internal.domain.Student;
import com.englms.students.internal.domain.StudentProfile;
import com.englms.students.internal.domain.StudentStatus;
import com.englms.students.internal.domain.UsernameSuggestions;
import com.englms.students.internal.persistence.StudentRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The students use cases (T-M2.3; FR-STU-01/02/03/05, FR-AUTH-07). The account side goes through {@link AccountApi}
 * inside the same transaction, so a create, rename or archive is atomic. Also the {@link StudentDirectory} API and the
 * shared {@link StudentPrincipals} SPI behind {@code CurrentStudent}.
 */
@Service
public class StudentService implements StudentDirectory, StudentPrincipals {

	private final StudentRepository students;

	private final AccountApi accounts;

	private final ApplicationEventPublisher events;

	private final Ids ids;

	private final Clock clock;

	private final GuardianService guardians;

	StudentService(StudentRepository students, AccountApi accounts, ApplicationEventPublisher events, Ids ids,
			Clock clock, GuardianService guardians) {
		this.students = students;
		this.accounts = accounts;
		this.events = events;
		this.ids = ids;
		this.clock = clock;
		this.guardians = guardians;
	}

	public record Created(StudentView student, TemporaryCredentials credentials) {
	}

	/**
	 * FR-STU-01: the account, the student and its guardians (T-M2.9) in one transaction; the credentials are returned
	 * only here.
	 */
	@Transactional
	public Created create(StudentCommands.Create command, UUID tutorId) {
		List<FieldProblem> problems = new ArrayList<>();
		StudentProfile profile = new StudentProfile(StudentFields.fullName(command.fullName(), problems),
				StudentFields.email(command.email(), problems), StudentFields.phone(command.phone(), problems),
				StudentFields.contactHandles(command.contactHandles(), problems),
				StudentFields.note(command.note(), problems));
		var guardianDetails = StudentFields.guardians(command.guardians(), problems);
		String username = command.username();
		checkUsername(username, problems);
		String password = command.password();
		if (password != null && !password.isEmpty()) {
			accounts.passwordProblems(password, username)
				.forEach(code -> problems.add(StudentFields.problem("password", code, code.name())));
		}
		if (!problems.isEmpty()) {
			throw ProblemException.validation(problems);
		}
		TemporaryCredentials credentials = accounts.createStudentAccount(username, password);
		Instant now = StudentFields.now(clock);
		Student student = students.saveAndFlush(new Student(ids.newId(), credentials.userId(), profile, tutorId, now));
		guardians.addAll(student.id(), guardianDetails, tutorId);
		events.publishEvent(new StudentCreated(student.id(), student.userId(), tutorId));
		return new Created(StudentView.of(student, credentials.username()), credentials);
	}

	/**
	 * FR-STU-02: {@code q} matches the full name, email, phone and handle values ({@code search_text}) and the username
	 * (identity, one lookup), accent- and case-insensitively and literally; the page's usernames come in one batch call.
	 */
	@Transactional(readOnly = true)
	public Page<StudentView> list(String q, Set<StudentStatus> statuses, PageRequest page) {
		String fragment = (q != null) ? Usernames.normalize(q) : "";
		Set<UUID> byUsername = fragment.isEmpty() ? Set.of() : accounts.studentUserIdsWithUsernameContaining(fragment);
		Specification<Student> spec = (root, query, cb) -> {
			Predicate status = root.get("status").in(statuses);
			if (fragment.isEmpty()) {
				return status;
			}
			Predicate match = cb.like(root.get("searchText"), Like.contains(fragment), Like.ESCAPE);
			if (!byUsername.isEmpty()) {
				match = cb.or(match, root.get("userId").in(byUsername));
			}
			return cb.and(status, match);
		};
		Page<Student> found = students.findAll(spec, page.withSort(page.getSort().and(Sort.by("id"))));
		Map<UUID, String> usernames = accounts.usernames(found.map(Student::userId).toList());
		return found.map(student -> StudentView.of(student, usernames.get(student.userId())));
	}

	@Transactional(readOnly = true)
	public StudentView get(UUID studentId) {
		return view(load(studentId));
	}

	/** FR-STU-03: present fields only; a username change keeps the student's sessions. */
	@Transactional
	public StudentView update(UUID studentId, StudentCommands.Update command, UUID tutorId) {
		if (command.version() == null || command.version() < 0) {
			throw ProblemException.validation(List.of((command.version() == null)
					? StudentFields.problem("version", ProblemCodes.REQUIRED, "The version read with the student")
					: StudentFields.problem("version", ProblemCodes.INVALID_VALUE, "0 or more")));
		}
		Student student = load(studentId);
		checkVersion(student, command.version());
		StudentProfile current = student.profile();
		List<FieldProblem> problems = new ArrayList<>();
		String fullName = (command.fullName() == null) ? current.fullName()
				: StudentFields.fullName(command.fullName().orElse(null), problems);
		String email = (command.email() == null) ? current.email()
				: StudentFields.email(command.email().orElse(null), problems);
		String phone = (command.phone() == null) ? current.phone()
				: StudentFields.phone(command.phone().orElse(null), problems);
		var handles = (command.contactHandles() == null) ? current.contactHandles()
				: StudentFields.contactHandles(command.contactHandles().orElse(null), problems);
		String note = (command.note() == null) ? current.note()
				: StudentFields.note(command.note().orElse(null), problems);
		String username = (command.username() == null) ? null : command.username().orElse(null);
		if (command.username() != null) {
			checkUsername(username, problems);
		}
		if (!problems.isEmpty()) {
			throw ProblemException.validation(problems);
		}
		student.apply(new StudentProfile(fullName, email, phone, handles, note), tutorId, StudentFields.now(clock));
		String currentUsername = username(student);
		if (username != null && !username.strip().equals(currentUsername)) {
			accounts.changeUsername(student.userId(), username);
			currentUsername = username.strip();
			events.publishEvent(new StudentUsernameChanged(student.id(), student.userId(), tutorId));
		}
		students.flush();
		return StudentView.of(student, currentUsername);
	}

	/** FR-STU-05, domain-model §4.1: archive disables the account (ends its sessions), reactivation enables it. */
	@Transactional
	public StudentView changeStatus(UUID studentId, StudentStatus target, long version, UUID tutorId) {
		Student student = load(studentId);
		checkVersion(student, version);
		if (!student.status().canBecome(target)) {
			throw new ProblemException(HttpStatus.CONFLICT, ProblemCodes.INVALID_STATE_TRANSITION);
		}
		StudentStatus from = student.changeStatus(target, tutorId, StudentFields.now(clock));
		if (target == StudentStatus.ARCHIVED) {
			accounts.disable(student.userId());
		}
		else if (from == StudentStatus.ARCHIVED) {
			accounts.enable(student.userId());
		}
		students.flush();
		events.publishEvent(new StudentStatusChanged(student.id(), student.userId(), from.name(), target.name(), tutorId));
		return view(student);
	}

	/** FR-AUTH-07; an archived student is reactivated first (409). */
	@Transactional
	public TemporaryCredentials resetPassword(UUID studentId, UUID tutorId) {
		Student student = load(studentId);
		if (student.status() == StudentStatus.ARCHIVED) {
			throw new ProblemException(HttpStatus.CONFLICT, ProblemCodes.INVALID_STATE_TRANSITION);
		}
		return accounts.resetPasswordByTutor(student.userId(), tutorId);
	}

	@Transactional(readOnly = true)
	public String suggestUsername(String fullName) {
		return UsernameSuggestions.firstFree(fullName,
				candidate -> accounts.checkUsername(candidate) != UsernameCheck.AVAILABLE);
	}

	public UsernameCheck checkUsername(String username) {
		return accounts.checkUsername(username);
	}

	@Override
	@Transactional(readOnly = true)
	public StudentRef require(UUID studentId) {
		Student student = load(studentId);
		return new StudentRef(student.id(), student.userId(), student.fullName());
	}

	@Override
	@Transactional(readOnly = true)
	public Optional<UUID> studentIdForUser(UUID userId) {
		return students.findIdByUserId(userId);
	}

	private Student load(UUID studentId) {
		return students.findById(studentId)
			.orElseThrow(() -> new ProblemException(HttpStatus.NOT_FOUND, ProblemCodes.NOT_FOUND));
	}

	private StudentView view(Student student) {
		return StudentView.of(student, username(student));
	}

	private String username(Student student) {
		return accounts.usernames(List.of(student.userId())).get(student.userId());
	}

	private static void checkUsername(String username, List<FieldProblem> problems) {
		if (StudentFields.text(username) == null) {
			problems.add(StudentFields.problem("username", ProblemCodes.REQUIRED, "Required"));
		}
		else if (!Usernames.isValid(username)) {
			problems.add(StudentFields.problem("username", ProblemCodes.USERNAME_INVALID,
					"3-40 characters of a-z, 0-9, '.', '_' or '-'"));
		}
	}

	private static void checkVersion(Student student, long version) {
		if (student.version() != version) {
			throw new ProblemException(HttpStatus.CONFLICT, ProblemCodes.STALE_VERSION);
		}
	}

}
