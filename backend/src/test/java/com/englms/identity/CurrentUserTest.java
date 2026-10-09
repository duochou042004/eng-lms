package com.englms.identity;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serial;
import java.io.Serializable;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.UUID;

import org.junit.jupiter.api.Test;

/**
 * T-M2.9 (DEC-100 S4-5): a session stored before {@link CurrentUser} had its credential stamp still reads back, with
 * stamp 0 (the column default), and the stamp is not in {@link CurrentUser#toString()}.
 */
class CurrentUserTest {

	/** {@link CurrentUser} as T-M2.1–T-M2.3 serialised it: same components minus the stamp, same serialVersionUID. */
	record CurrentUserBefore(UUID userId, Role role, boolean mustChangePassword) implements Serializable {

		@Serial
		private static final long serialVersionUID = 1L;

	}

	@Test
	void aSessionPrincipalStoredWithoutTheStampReadsBackWithStampZero() throws Exception {
		UUID id = UUID.randomUUID();
		byte[] stored = renameClass(serialize(new CurrentUserBefore(id, Role.STUDENT, true)),
				CurrentUserBefore.class.getName(), CurrentUser.class.getName());

		try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(stored))) {
			assertThat(in.readObject()).isEqualTo(new CurrentUser(id, Role.STUDENT, true, 0));
		}
	}

	@Test
	void toStringLeavesTheStampOut() {
		assertThat(new CurrentUser(UUID.randomUUID(), Role.TUTOR, false, 424242).toString()).doesNotContain("424242",
				"credentialStamp");
	}

	static byte[] serialize(Object value) throws IOException {
		ByteArrayOutputStream bytes = new ByteArrayOutputStream();
		try (ObjectOutputStream out = new ObjectOutputStream(bytes)) {
			out.writeObject(value);
		}
		return bytes.toByteArray();
	}

	/** Replaces the class name in the stream's class descriptor (a modified-UTF string with a two-byte length). */
	static byte[] renameClass(byte[] stream, String from, String to) {
		byte[] old = utf(from);
		byte[] replacement = utf(to);
		for (int i = 0; i <= stream.length - old.length; i++) {
			if (Arrays.equals(stream, i, i + old.length, old, 0, old.length)) {
				byte[] result = new byte[stream.length - old.length + replacement.length];
				System.arraycopy(stream, 0, result, 0, i);
				System.arraycopy(replacement, 0, result, i, replacement.length);
				System.arraycopy(stream, i + old.length, result, i + replacement.length, stream.length - i - old.length);
				return result;
			}
		}
		throw new IllegalArgumentException(from + " not in the stream");
	}

	static byte[] utf(String name) {
		byte[] text = name.getBytes(StandardCharsets.UTF_8);
		byte[] result = new byte[text.length + 2];
		result[0] = (byte) (text.length >> 8);
		result[1] = (byte) text.length;
		System.arraycopy(text, 0, result, 2, text.length);
		return result;
	}

}
