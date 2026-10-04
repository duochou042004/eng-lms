package com.englms.identity.internal.cli;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ExitCodeGenerator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

/**
 * An {@code --englms.cli=} value that names no command: one line on stderr with the known commands, exit code 1
 * (runbooks §4: 1 = any other failure; QA F5). Nothing is changed.
 */
@Component
@ConditionalOnExpression("!'${englms.cli:}'.isEmpty() && '${englms.cli:}' != 'reset-tutor-password'")
class UnknownCliCommand implements ApplicationRunner {

	static final String KNOWN = "reset-tutor-password";

	@Override
	public void run(ApplicationArguments args) {
		System.err.println("Unknown --englms.cli command; known commands: " + KNOWN);
		throw new Unknown();
	}

	static final class Unknown extends IllegalStateException implements ExitCodeGenerator {

		Unknown() {
			super("Unknown --englms.cli command; known commands: " + KNOWN);
		}

		@Override
		public int getExitCode() {
			return 1;
		}

	}

}
