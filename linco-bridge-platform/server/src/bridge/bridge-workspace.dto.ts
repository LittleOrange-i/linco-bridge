export interface BridgeWorkspaceSessionDto {
  id: string
  title: string
  timeText?: string
  bindCommand?: string
  historyCommand?: string
  updatedAt?: number
  /** 任务是否运行中（来自连接器 thread-writer-locks / Harness running 标志） */
  running?: boolean
  /** 任务所在工作目录（全量线程列表时为线程自己的 cwd） */
  workspace?: string
  /** 数据来源（codex-app-server / deepseek-harness 等） */
  source?: string
}

export interface WorkspaceApplyInputDto {
  projectPath?: string
  project_path?: string
  projectName?: string
  project_name?: string
  agentSessionId?: string
  agent_session_id?: string
  sessionTitle?: string
  session_title?: string
  bindCommand?: string
  bind_command?: string
  selectProjectCommand?: string
  select_project_command?: string
  platformSessionId?: string
  platform_session_id?: string
}

export interface WorkspaceApplyResultDto {
  sessionId: string
  title: string
  projectPath: string
  projectName: string
  agentSessionId?: string
}
