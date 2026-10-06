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

	/** Not annotated itself, but holds a tutor-private field (T-M2.2 SEC S3-4). */
	public static class LessonView {

		public String title;

		@TutorPrivate
		public String privateNote;

	}

}
