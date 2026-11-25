package com.englms.settings.internal;

import org.springframework.data.jpa.repository.JpaRepository;

interface WorkspaceSettingRepository extends JpaRepository<WorkspaceSetting, String> {
}
