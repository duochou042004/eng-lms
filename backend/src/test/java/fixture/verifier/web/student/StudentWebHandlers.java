package fixture.verifier.web.student;

import com.englms.shared.web.Audience;
import org.springframework.web.bind.annotation.GetMapping;
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
		public String probe() {
			return "";
		}

	}

	@RestController
	public static class TutorInStudentWeb {

		@GetMapping("/api/v1/tutor/probe")
		@Audience(Audience.Kind.TUTOR)
		public String probe() {
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
