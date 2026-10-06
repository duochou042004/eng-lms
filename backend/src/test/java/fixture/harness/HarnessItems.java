package fixture.harness;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import com.englms.security.IsolationWorld;
import com.englms.security.IsolationWorldContributor;

/**
 * HarnessDetectionTest's world contributor: one item for A, one for B, and a secret marker in B's item. Outside
 * {@code com.englms}, so only the contexts that import it see it.
 */
public class HarnessItems implements IsolationWorldContributor {

	public final Map<UUID, UUID> ownerOfItem = new ConcurrentHashMap<>();

	public volatile UUID studentB;

	@Override
	public void contribute(IsolationWorld world) {
		UUID itemOfA = UUID.randomUUID();
		UUID itemOfB = UUID.randomUUID();
		ownerOfItem.put(itemOfA, world.studentA().id());
		ownerOfItem.put(itemOfB, world.studentB().id());
		studentB = world.studentB().id();
		world.ownedByA("itemId", itemOfA);
		world.ownedByB(itemOfB);
		world.secret("SECRET-ITEM-B-7F3C");
	}

	@Override
	public void reset() {
		ownerOfItem.clear();
	}

}
