package com.englms.shared.web;

import org.apache.catalina.Host;
import org.apache.catalina.Pipeline;
import org.apache.catalina.Valve;
import org.apache.catalina.core.StandardHost;
import org.apache.catalina.valves.ErrorReportValve;

import com.englms.shared.Ids;
import org.springframework.boot.tomcat.ConfigurableTomcatWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;

/**
 * Installs {@link ProblemDetailsErrorReportValve} on the application port's Tomcat host in place of the
 * {@link ErrorReportValve} that Spring Boot adds (T-M1.8 AC2). It runs last, so Boot's valve is already in the
 * pipeline when it is swapped, and the host is told the valve's class so it doesn't add another one at start-up.
 * This bean lives in the application context only: the management port keeps Tomcat's minimal report (DEC-050).
 * <p>
 * It also lets {@code TRACE} through Tomcat's connector ({@code allowTrace}): Tomcat's own refusal was answered by
 * Boot's {@code /error} page outside the filters (Whitelabel HTML, the path reflected, no security headers). Let in,
 * the request reaches Spring Security's firewall, which rejects the method with a 405 Problem Details response
 * (DEC-069, T-M1.8 SEC review S4-3, T-M2.1 AC10). No handler ever serves {@code TRACE}.
 */
@Component
class ProblemDetailsErrorReportCustomizer implements WebServerFactoryCustomizer<ConfigurableTomcatWebServerFactory>, Ordered {

	private final Ids ids;

	ProblemDetailsErrorReportCustomizer(Ids ids) {
		this.ids = ids;
	}

	@Override
	public void customize(ConfigurableTomcatWebServerFactory factory) {
		factory.addConnectorCustomizers(connector -> connector.setAllowTrace(true));
		factory.addContextCustomizers(context -> {
			Host host = (Host) context.getParent();
			Pipeline pipeline = host.getPipeline();
			for (Valve valve : pipeline.getValves()) {
				if (valve instanceof ErrorReportValve) {
					pipeline.removeValve(valve);
				}
			}
			pipeline.addValve(new ProblemDetailsErrorReportValve(ids));
			if (host instanceof StandardHost standardHost) {
				standardHost.setErrorReportValveClass(ProblemDetailsErrorReportValve.class.getName());
			}
		});
	}

	@Override
	public int getOrder() {
		return Ordered.LOWEST_PRECEDENCE;
	}

}
