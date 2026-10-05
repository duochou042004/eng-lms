package com.englms.identity.internal.cli;

import java.io.PrintStream;

import com.englms.identity.internal.app.AccountService;
import com.englms.identity.internal.app.AccountService.NoTutorException;
import com.englms.identity.internal.app.AccountService.OperatorReset;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ExitCodeGenerator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * FR-AUTH-09, runbooks §4: {@code java -jar app.jar --englms.cli=reset-tutor-password
 * --spring.main.web-application-type=none}. Prints one temporary password to stdout (never to the log) and exits;
 * exits with status 2 and creates nobody when there is no tutor. Its context has no bootstrap and no scheduled jobs.
 */
@Component
@ConditionalOnProperty(name = "englms.cli", havingValue = "reset-tutor-password")
class ResetTutorPasswordCommand implements ApplicationRunner {

	static final int NO_TUTOR_EXIT_CODE = 2;

	private final AccountService accounts;

	private final PrintStream out;

	ResetTutorPasswordCommand(AccountService accounts) {
		this.accounts = accounts;
		this.out = System.out;
	}

	@Override
	public void run(ApplicationArguments args) {
		OperatorReset reset;
		try {
			reset = accounts.resetTutorPasswordByOperator();
		}
		catch (NoTutorException ex) {
			throw new NoTutor(ex);
		}
		out.println("Temporary password for the tutor '" + reset.username() + "': " + reset.temporaryPassword());
		out.println("It expires at " + reset.expiresAt() + " and must be changed at the next sign-in. "
				+ "The lockout is cleared and every session of the tutor has ended.");
		out.flush();
	}

	static final class NoTutor extends IllegalStateException implements ExitCodeGenerator {

		NoTutor(NoTutorException cause) {
			super(cause.getMessage(), cause);
		}

		@Override
		public int getExitCode() {
			return NO_TUTOR_EXIT_CODE;
		}

	}

}
