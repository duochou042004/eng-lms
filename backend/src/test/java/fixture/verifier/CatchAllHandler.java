package fixture.verifier;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** A third-party-like handler (outside {@code com.englms}) whose catch-all pattern also matches {@code /api/**} (S4-1). */
@RestController
public class CatchAllHandler {

	@GetMapping("/{*rest}")
	public String probe() {
		return "";
	}

}
