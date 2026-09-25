package com.englms.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Rule 6 (test-strategy.md §4): curricula, exam semantics and excluded product scope are tutor data or non-goals, so
 * their identifiers must never appear in production sources. Tests and docs are allowed (they are outside src/main).
 */
class ForbiddenIdentifiersTest {

	static final List<String> FORBIDDEN = List.of("toeic", "ielts", "thpt", "tenant", "payment", "invoice", "openai",
			"anthropic", "chatgpt");

	static final Pattern PATTERN = Pattern.compile(String.join("|", FORBIDDEN), Pattern.CASE_INSENSITIVE);

	@Test
	void productionSourcesContainNoForbiddenIdentifiers() {
		assertThat(scan(Path.of("src/main"))).isEmpty();
	}

	@ParameterizedTest
	@ValueSource(strings = { "toeic", "IELTS", "ThptMockExam", "tenant_id", "PaymentService", "invoice",
			"OpenAiClient", "anthropic", "chatgpt" })
	void detectsEachForbiddenIdentifierInAFixture(String identifier, @TempDir Path root) throws IOException {
		Path file = root.resolve("src/main/java/com/example/Fixture.java");
		Files.createDirectories(file.getParent());
		Files.writeString(file, "class Fixture { String x = \"" + identifier + "\"; }\n");

		assertThat(scan(root.resolve("src/main"))).singleElement().asString().contains("Fixture.java:1");
	}

	@Test
	void detectsForbiddenIdentifiersInFileNames(@TempDir Path root) throws IOException {
		Path file = root.resolve("src/main/resources/toeic-parts.yml");
		Files.createDirectories(file.getParent());
		Files.writeString(file, "ok: true\n");

		assertThat(scan(root.resolve("src/main"))).singleElement().asString().contains("toeic-parts.yml");
	}

	@Test
	void acceptsCleanSources(@TempDir Path root) throws IOException {
		Path file = root.resolve("src/main/java/Clean.java");
		Files.createDirectories(file.getParent());
		Files.writeString(file, "class Clean { String exam = \"user-defined\"; }\n");

		assertThat(scan(root.resolve("src/main"))).isEmpty();
	}

	static List<String> scan(Path root) {
		List<String> findings = new ArrayList<>();
		try (Stream<Path> files = Files.walk(root)) {
			files.filter(Files::isRegularFile).forEach(file -> {
				Matcher name = PATTERN.matcher(file.getFileName().toString());
				if (name.find()) {
					findings.add(file + ": file name contains '" + name.group() + "'");
				}
				List<String> lines = readLines(file);
				for (int i = 0; i < lines.size(); i++) {
					Matcher line = PATTERN.matcher(lines.get(i));
					if (line.find()) {
						findings.add(file + ":" + (i + 1) + ": contains '" + line.group() + "'");
					}
				}
			});
		}
		catch (IOException ex) {
			throw new UncheckedIOException(ex);
		}
		return findings;
	}

	private static List<String> readLines(Path file) {
		try {
			return Files.readAllLines(file, StandardCharsets.UTF_8);
		}
		catch (IOException ex) {
			// Binary resources: the file name has already been checked.
			return List.of();
		}
	}

}
