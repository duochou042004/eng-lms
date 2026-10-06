package fixture.archunit.web.student;

import java.util.UUID;

import com.englms.shared.web.TutorPrivate;
import fixture.archunit.PrivateTypes.LearningProfileSummary;
import fixture.archunit.PrivateTypes.PrivateRemark;
import fixture.archunit.notes.FixtureNote;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * Student-audience classes that break test-strategy §4 rules 3 and 4 one way each, plus a clean one
 * (StudentIsolationRulesTest). Outside {@code com.englms}, so no application context or module sees them.
 */
public final class StudentWebFixtures {

	private StudentWebFixtures() {
	}

	public static class ParameterNamedStudentId {

		@GetMapping("/fixture")
		public String get(UUID studentId) {
			return "";
		}

	}

	public static class ParameterEndingInStudentId {

		@GetMapping("/fixture")
		public String get(UUID peerStudentId) {
			return "";
		}

	}

	public static class PathVariableNamedStudentId {

		@GetMapping("/fixture/{studentId}")
		public String get(@PathVariable("studentId") UUID id) {
			return "";
		}

	}

	public static class RequestParamEndingInStudentId {

		@GetMapping("/fixture")
		public String get(@RequestParam(name = "otherStudentId") UUID other) {
			return "";
		}

	}

	public record DependsOnNotes(FixtureNote note) {
	}

	public record DependsOnLearningProfile(LearningProfileSummary profile) {
	}

	public record DependsOnTutorPrivateType(PrivateRemark remark) {
	}

	public static class HoldsTutorPrivateField {

		@TutorPrivate
		String remark;

	}

	public static class Clean {

		@GetMapping("/fixture/{itemId}")
		public String get(@PathVariable UUID itemId, @RequestParam(required = false) String studentName) {
			return "";
		}

	}

}
