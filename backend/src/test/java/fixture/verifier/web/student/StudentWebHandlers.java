package fixture.verifier.web.student;

import com.englms.shared.web.Audience;
import com.englms.shared.web.CurrentStudent;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.MatrixVariable;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.SessionAttribute;
import org.springframework.web.bind.annotation.RestController;

/**
 * Handlers in a {@code ..web.student..} package for AudienceVerifierTest (T-M2.2 SEC round 1 S3-3, S4-2). Outside
 * {@code com.englms}, so no application context scans them.
 */
public final class StudentWebHandlers {

	private StudentWebHandlers() {
	}

	@RestController
	public static class ValidStudent {

		@GetMapping("/api/v1/student/a")
		@Audience(Audience.Kind.STUDENT)
		public String probe(CurrentStudent me) {
			return "";
		}

	}

	@RestController
	@Audience(Audience.Kind.STUDENT)
	public static class InheritsFromOutside extends fixture.verifier.InheritedStudentHandlers {

	}

	@RestController
	public static class TutorInStudentWeb {

		@GetMapping("/api/v1/tutor/probe")
		@Audience(Audience.Kind.TUTOR)
		public String probe() {
			return "";
		}

	}

	/** Every binding annotation on a {@link CurrentStudent} parameter (T-M2.3 G3 SEC-S3-2): refused. */
	@RestController
	@Audience(Audience.Kind.STUDENT)
	@RequestMapping("/api/v1/student/bound")
	public static class BoundCurrentStudent {

		@GetMapping("/model")
		public String model(@ModelAttribute CurrentStudent me) {
			return "";
		}

		@PostMapping("/body")
		public String body(@RequestBody CurrentStudent me) {
			return "";
		}

		@GetMapping("/param")
		public String param(@RequestParam CurrentStudent me) {
			return "";
		}

		@GetMapping("/path/{me}")
		public String path(@PathVariable CurrentStudent me) {
			return "";
		}

		@GetMapping("/header")
		public String header(@RequestHeader CurrentStudent me) {
			return "";
		}

		@GetMapping("/cookie")
		public String cookie(@CookieValue CurrentStudent me) {
			return "";
		}

		@GetMapping("/matrix")
		public String matrix(@MatrixVariable CurrentStudent me) {
			return "";
		}

		@PostMapping("/part")
		public String part(@RequestPart CurrentStudent me) {
			return "";
		}

		@GetMapping("/attribute")
		public String attribute(@RequestAttribute CurrentStudent me) {
			return "";
		}

		@GetMapping("/session")
		public String session(@SessionAttribute CurrentStudent me) {
			return "";
		}

	}

	@RestController
	public static class StudentIdVariable {

		@GetMapping("/api/v1/student/peers/{peer_StudentId}/notes")
		@Audience(Audience.Kind.STUDENT)
		public String probe() {
			return "";
		}

	}

}
