package fixture.archunit;

import com.englms.shared.web.TutorPrivate;

/** Rule-4 targets for StudentIsolationRulesTest: a {@code LearningProfile*} type and a {@code @TutorPrivate} type. */
public final class PrivateTypes {

	private PrivateTypes() {
	}

	public record LearningProfileSummary(String weaknesses) {
	}

	@TutorPrivate
	public record PrivateRemark(String text) {
	}

}
