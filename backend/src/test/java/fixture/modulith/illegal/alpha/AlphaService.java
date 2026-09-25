package fixture.modulith.illegal.alpha;

import fixture.modulith.illegal.beta.internal.BetaInternal;

public class AlphaService {

	BetaInternal leak = new BetaInternal();

}
