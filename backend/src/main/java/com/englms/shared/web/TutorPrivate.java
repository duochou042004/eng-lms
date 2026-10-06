package com.englms.shared.web;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a type or field holding private tutor data (NFR-SEC-02). No {@code ..web.student..} class may depend on a type
 * carrying it (test-strategy.md §4 rule 4, ADR-0016 §4).
 */
@Target({ ElementType.TYPE, ElementType.FIELD })
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface TutorPrivate {

}
