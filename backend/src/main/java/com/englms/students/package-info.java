/**
 * Students (module-boundaries.md, T-M2.3): the {@code student} table, create-with-account, profile and contacts, the
 * status lifecycle and the tutor's password reset. Public API: {@link com.englms.students.StudentDirectory}; events in
 * {@code students.events}; it implements the shared {@code StudentPrincipals} SPI behind {@code CurrentStudent}.
 * Accounts are identity's ({@code AccountApi}); queries never join {@code user_account}.
 */
@ApplicationModule(displayName = "Students", allowedDependencies = { "shared", "identity" })
package com.englms.students;

import org.springframework.modulith.ApplicationModule;
