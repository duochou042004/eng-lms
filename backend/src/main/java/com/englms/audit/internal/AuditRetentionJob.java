package com.englms.audit.internal;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/**
 * The daily purge of audit events older than 365 days (security.md §8). Scheduling is on in the server only; the
 * operator CLI's context ({@code --englms.cli=…}) runs no scheduled job.
 */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
@ConditionalOnExpression("'${englms.cli:}'.isEmpty()")
class AuditRetentionJob {

	private static final Logger log = LoggerFactory.getLogger(AuditRetentionJob.class);

	private final AuditService audit;

	AuditRetentionJob(AuditService audit) {
		this.audit = audit;
	}

	@Scheduled(cron = "0 30 3 * * *")
	void purge() {
		log.info("Audit retention: deleted {} events older than 365 days", audit.purgeExpired());
	}

}
