package com.englms.students.internal.domain;

/** A free-text contact handle ({@code Zalo}, {@code Facebook}, … are examples, not an enum). */
public record ContactHandle(String label, String value) {
}
