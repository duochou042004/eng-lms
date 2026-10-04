package com.englms.identity.internal.bootstrap;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.englms.identity.Role;
import com.englms.identity.Usernames;
import com.englms.identity.events.TutorBootstrapped;
import com.englms.identity.internal.domain.PasswordPolicy;
import com.englms.identity.internal.domain.UserAccount;
import com.englms.identity.internal.persistence.UserAccountRepository;
import com.englms.shared.Ids;
import com.englms.shared.ProblemCodes;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * FR-AUTH-02: at the first start, the one tutor is created from {@code ENGLMS_BOOTSTRAP_TUTOR_USERNAME} and the
 * password file {@code ENGLMS_BOOTSTRAP_TUTOR_PASSWORD_FILE} (a Podman secret; never a password value), with
 * {@code mustChangePassword=true}. It runs while the context starts, before the web server accepts requests: a bad
 * configuration stops startup, and the error never contains the password. Once a tutor exists the variables are
 * ignored. Not part of the operator CLI's context.
 */
@Component
@ConditionalOnExpression("environment.getProperty('englms.cli', '').isEmpty()")
class TutorBootstrap implements SmartInitializingSingleton {

	private static final Logger log = LoggerFactory.getLogger(TutorBootstrap.class);

	private final UserAccountRepository accounts;

	private final PasswordEncoder encoder;

	private final PasswordPolicy policy;

	private final ApplicationEventPublisher events;

	private final TransactionTemplate transactions;

	private final Ids ids;

	private final Clock clock;

	private final String username;

	private final String passwordFile;

	TutorBootstrap(UserAccountRepository accounts, PasswordEncoder encoder, PasswordPolicy policy,
			ApplicationEventPublisher events, TransactionTemplate transactions, Ids ids, Clock clock,
			@Value("${englms.bootstrap.tutor.username:}") String username,
			@Value("${englms.bootstrap.tutor.password-file:}") String passwordFile) {
		this.accounts = accounts;
		this.encoder = encoder;
		this.policy = policy;
		this.events = events;
		this.transactions = transactions;
		this.ids = ids;
		this.clock = clock;
		this.username = username.strip();
		this.passwordFile = passwordFile.strip();
	}

	@Override
	public void afterSingletonsInstantiated() {
		transactions.executeWithoutResult(status -> bootstrap());
	}

	private void bootstrap() {
		if (accounts.existsByRole(Role.TUTOR)) {
			log.info("A tutor account exists; the tutor bootstrap variables are ignored");
			return;
		}
		if (username.isEmpty() && passwordFile.isEmpty()) {
			log.warn("No tutor account and no ENGLMS_BOOTSTRAP_TUTOR_* variables: nobody can sign in until they are set");
			return;
		}
		if (username.isEmpty() || passwordFile.isEmpty()) {
			throw new IllegalStateException(
					"Tutor bootstrap needs both ENGLMS_BOOTSTRAP_TUTOR_USERNAME and ENGLMS_BOOTSTRAP_TUTOR_PASSWORD_FILE");
		}
		if (!Usernames.isValid(username)) {
			throw new IllegalStateException("ENGLMS_BOOTSTRAP_TUTOR_USERNAME must be 3-40 characters of a-z, 0-9, '.', "
					+ "'_' or '-' (validation-rules.md)");
		}
		String password = PasswordPolicy.normalize(readPassword());
		List<ProblemCodes> violations = policy.violations(password, username);
		if (!violations.isEmpty()) {
			throw new IllegalStateException("The tutor bootstrap password violates the password policy: " + violations);
		}
		Instant now = clock.instant();
		UserAccount tutor = accounts.save(new UserAccount(ids.newId(), username, encoder.encode(password), Role.TUTOR, now));
		events.publishEvent(new TutorBootstrapped(tutor.id()));
		log.info("Tutor account created from the bootstrap secret; the password must be changed at first sign-in");
	}

	/** The file content without a trailing line break (as {@code echo} writes it). */
	private String readPassword() {
		try {
			return Files.readString(Path.of(passwordFile), StandardCharsets.UTF_8).replaceFirst("\\R\\z", "");
		}
		catch (IOException | RuntimeException ex) {
			throw new IllegalStateException("The tutor bootstrap password file is missing or unreadable: " + passwordFile);
		}
	}

}
