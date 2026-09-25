# ADR-0002: Java 25, Spring Boot 4.1, Maven Wrapper, generated with the Spring Boot CLI

- Status: Accepted (baseline) · Date: 2026-09-25 · Deciders: LC, PO directive · Trace: PO goal (stack), SPEC §36 (overridden, C-01)

## Context
The PO mandates SDKMAN JDK 25, the Spring Boot CLI, Node.js and Podman. SPEC §36 proposed .NET "if built with .NET" (a conditional suggestion).
The environment has JDK 25.0.4-tem and Spring Boot CLI 4.1.0; Initializr defaults to Boot 4.1.1. No global Maven or Gradle is installed.

## Decision
- The backend is generated with `spring init` (Boot 4.1.x, Java 25, **Maven project**, packaging jar, group `com.englms`, artifact `englms`).
  The exact command is recorded in the T-M1.2 evidence.
- Use the **Maven Wrapper** (`./mvnw`) for all builds. Pin JDK and CLI versions with `.sdkmanrc`.
- Follow Boot 4 idioms (modular starters as generated, Jackson 3, JUnit version per the BOM, `@MockitoBean`). No Boot 2/3 copy-paste.

## Alternatives considered
- Gradle (Kotlin DSL): faster builds and a build cache, but build scripts are more free-form and agents make more mistakes in them. We can revisit if build time exceeds 5 minutes.
- Java 21: rejected; the PO specified JDK 25 (also an LTS).

## Consequences
+ A reproducible toolchain with no global installs. − Boot 4 is new, and agent training data skews to Boot 3 (R-06). Mitigation: the pitfalls list, docs lookup, M1 spike.

## Verification
`./mvnw -v` reports Java 25. CI uses `actions/setup-java` with Temurin 25. `spring init` evidence is committed.
