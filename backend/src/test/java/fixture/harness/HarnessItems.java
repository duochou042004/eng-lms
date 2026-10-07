package fixture.harness;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import com.englms.security.IsolationWorld;
import com.englms.security.IsolationWorldContributor;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * HarnessDetectionTest's world contributor: one item for A, one for B (keyed by student ID, as an owner-scoped
 * repository would be), and a secret marker in B's item. Outside {@code com.englms}, so only the contexts that import
 * it see it; it runs after the students contributor, whose rows it reads.
 */
public class HarnessItems implements IsolationWorldContributor {

	public final Map<UUID, UUID> ownerOfItem = new ConcurrentHashMap<>();

	public volatile UUID studentB;

	private final JdbcTemplate jdbc;

	public HarnessItems(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	@Override
	public void contribute(IsolationWorld world) {
		UUID itemOfA = UUID.randomUUID();
		UUID itemOfB = UUID.randomUUID();
		ownerOfItem.put(itemOfA, studentIdOf(world.studentA().id()));
		ownerOfItem.put(itemOfB, studentIdOf(world.studentB().id()));
		studentB = world.studentB().id();
		world.ownedByA("itemId", itemOfA);
		world.ownedByB(itemOfB);
		world.secret("SECRET-ITEM-B-7F3C");
	}

	public UUID studentIdOf(UUID userId) {
		return jdbc.queryForObject("SELECT id FROM student WHERE user_id = ?", UUID.class, userId);
	}

	@Override
	public void reset() {
		ownerOfItem.clear();
	}

}
