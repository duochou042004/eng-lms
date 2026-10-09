package fixture.archunit.web.student;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

import com.englms.shared.web.CurrentStudent;
import com.englms.shared.web.TutorPrivate;
import fixture.archunit.PrivateTypes.LearningProfileSummary;
import fixture.archunit.PrivateTypes.LessonView;
import fixture.archunit.PrivateTypes.PrivateRemark;
import fixture.archunit.notes.FixtureNote;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.MatrixVariable;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;

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

	// ---- T-M2.9 (DEC-097 (4) (a)): headers, cookies, matrix variables and bound fields ---------------------------

	public static class HeaderNamedStudentId {

		@GetMapping("/fixture")
		public String get(@RequestHeader("X-Student-Id") UUID peer) {
			return "";
		}

	}

	public static class CookieEndingInStudentId {

		@GetMapping("/fixture")
		public String get(@CookieValue(name = "lastStudentId") String last) {
			return "";
		}

	}

	public static class MatrixVariableNamedStudentId {

		@GetMapping("/fixture/{segment}")
		public String get(@PathVariable String segment, @MatrixVariable("student_id") UUID peer) {
			return "";
		}

	}

	public record StudentIdBody(UUID studentId, String text) {
	}

	public static class BodyRecordComponent {

		@PostMapping("/fixture")
		public String post(@RequestBody StudentIdBody body) {
			return "";
		}

	}

	public static class Inner {

		public UUID peerStudentId;

	}

	public record Outer(String title, Inner inner) {
	}

	public static class NestedBodyField {

		@PostMapping("/fixture")
		public String post(@RequestBody Outer body) {
			return "";
		}

	}

	public record Entry(UUID studentId) {
	}

	public record Batch(List<Entry> entries) {
	}

	public static class BodyFieldInsideAList {

		@PostMapping("/fixture")
		public String post(@RequestBody Batch body) {
			return "";
		}

	}

	public record Renamed(@JsonProperty("studentId") UUID peer) {
	}

	public static class JsonPropertyRename {

		@PostMapping("/fixture")
		public String post(@RequestBody Renamed body) {
			return "";
		}

	}

	public record Aliased(@JsonAlias({ "other", "student_id" }) UUID peer) {
	}

	public static class JsonAliasRename {

		@PostMapping("/fixture")
		public String post(@RequestBody Aliased body) {
			return "";
		}

	}

	public record PartMeta(String caption, UUID studentId) {
	}

	public static class RequestPartField {

		@PostMapping("/fixture")
		public String post(@RequestPart("meta") PartMeta meta) {
			return "";
		}

	}

	public static class Filter {

		public UUID studentId;

	}

	public static class ModelAttributeField {

		@GetMapping("/fixture")
		public String get(@ModelAttribute Filter filter) {
			return "";
		}

	}

	public record Query(String text, UUID studentId) {
	}

	public static class UnannotatedModelAttributeField {

		@GetMapping("/fixture")
		public String get(Query query) {
			return "";
		}

	}

	public static class ArrayOfBodies {

		@PostMapping("/fixture")
		public String post(@RequestBody Entry[] entries) {
			return "";
		}

	}

	public record WithOptional(Optional<Entry> entry) {
	}

	public static class OptionalBodyField {

		@PostMapping("/fixture")
		public String post(@RequestBody WithOptional body) {
			return "";
		}

	}

	public record WithMap(Map<String, Entry> byKey) {
	}

	public static class MapValueBodyField {

		@PostMapping("/fixture")
		public String post(@RequestBody WithMap body) {
			return "";
		}

	}

	/** A self-referencing type: the recursion must stop (cycle-safe) and report nothing. */
	public record Node(String label, Node next, List<Node> children, Map<String, Node[]> byName) {
	}

	public record CleanBody(String studentName, Node tree) {
	}

	public record DependsOnNotes(FixtureNote note) {
	}

	public record DependsOnLearningProfile(LearningProfileSummary profile) {
	}

	public record DependsOnTutorPrivateType(PrivateRemark remark) {
	}

	public record DependsOnTypeWithTutorPrivateField(LessonView lesson) {
	}

	public static class HoldsTutorPrivateField {

		@TutorPrivate
		String remark;

	}

	/** Also: {@code CurrentStudent} (its {@code studentId} comes from the session) and a cyclic body pass. */
	public static class Clean {

		@GetMapping("/fixture/{itemId}")
		public String get(@PathVariable UUID itemId, @RequestParam(required = false) String studentName) {
			return "";
		}

		@PostMapping("/fixture/{itemId}")
		public String post(@PathVariable UUID itemId, CurrentStudent me, @RequestHeader("X-Request-Id") String requestId,
				@CookieValue("XSRF-TOKEN") String csrf, @RequestBody CleanBody body) {
			return "";
		}

	}

}
