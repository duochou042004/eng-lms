/**
 * Shared kernel: IDs, the {@link java.time.Clock}, problem codes and the cross-cutting web plumbing
 * (Problem Details, request IDs, security headers, SPA serving). It holds no business rules of any module (module-boundaries.md).
 */
@ApplicationModule(displayName = "Shared kernel", type = ApplicationModule.Type.OPEN)
package com.englms.shared;

import org.springframework.modulith.ApplicationModule;
