package fixture.verifier;

import org.springframework.web.bind.annotation.GetMapping;

/**
 * A base class outside {@code ..web.student..} whose handler method a student controller inherits (T-M2.2 SEC round 2
 * N2-3): ArchUnit rule 3 checks only methods declared in {@code ..web.student..}, so the verifier refuses this.
 */
public class InheritedStudentHandlers {

	@GetMapping("/api/v1/student/inherited")
	public String probe() {
		return "";
	}

}
