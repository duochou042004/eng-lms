package fixture.harness.web.student;

import java.util.Map;
import java.util.UUID;

import com.englms.shared.web.Audience;
import com.englms.shared.web.CurrentStudent;
import fixture.harness.HarnessItems;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Test-only student handlers for HarnessDetectionTest, in a {@code ..web.student..} package as the L2 verifier requires
 * for {@code STUDENT} handlers (T-M2.2 SEC S3-3).
 */
@RestController
@Audience(Audience.Kind.STUDENT)
@RequestMapping("/api/v1/student/harness")
public class HarnessStudentHandlers {

	private final HarnessItems items;

	public HarnessStudentHandlers(HarnessItems items) {
		this.items = items;
	}

	/** Leaks B's user ID, upper-cased, in the body. */
	@GetMapping("/leak-id")
	public Map<String, String> leakId() {
		return Map.of("peer", items.studentB.toString().toUpperCase());
	}

	/** Leaks a secret marker, lower-cased, in a header. */
	@GetMapping("/leak-secret")
	public ResponseEntity<Void> leakSecret() {
		return ResponseEntity.noContent().header("X-Fixture-Note", "secret-item-b-7f3c").build();
	}

	/** Owner-scoped by {@link CurrentStudent}: someone else's item is a 404 (ADR-0016 §3). */
	@GetMapping("/items/{itemId}")
	public Map<String, UUID> item(@PathVariable UUID itemId, CurrentStudent me) {
		if (!me.studentId().equals(items.ownerOfItem.get(itemId))) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		}
		return Map.of("id", itemId);
	}

	/** The resolved {@link CurrentStudent} (T-M2.3 AC8). */
	@GetMapping("/me")
	public Map<String, UUID> me(CurrentStudent me) {
		return Map.of("studentId", me.studentId(), "userId", me.userId());
	}

	/** Not owner-scoped: the bug the "B on A's resource" check exists for. */
	@GetMapping("/unscoped-items/{itemId}")
	public Map<String, UUID> unscopedItem(@PathVariable UUID itemId) {
		return Map.of("id", itemId);
	}

}
