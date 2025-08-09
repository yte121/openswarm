/**
 * Type definitions for the start command module
 */

export interface ProcessInfo {
  id: string;
  name: string;
  type: ProcessType;
  status: ProcessStatus;
  pid?: number;
  startTime?: number;
  config?: Record<string, any>;
  metrics?: ProcessMetrics;
}

export enum ProcessType {
  ORCHESTRATOR = 'orchestrator',
  MCP_SERVER = 'mcp-server',
  MEMORY_MANAGER = 'memory-manager',
  TERMINAL_POOL = 'terminal-pool',
  COORDINATOR = 'coordinator',
  EVENT_BUS = 'event-bus',
}

export enum ProcessStatus {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  ERROR = 'error',
  CRASHED = 'crashed',
}

export interface ProcessMetrics {
  cpu?: number;
  memory?: number;
  uptime?: number;
  restarts?: number;
  lastError?: string;
}

export interface SystemStats {
  totalProcesses: number;
  runningProcesses: number;
  stoppedProcesses: number;
  errorProcesses: number;
  systemUptime: number;
  totalMemory: number;
  totalCpu: number;
}

export interface StartOptions {
  force?: boolean;
  healthCheck?: boolean;
  timeout?: number;
  verbose?: boolean;
  config?: string;
  dry?: boolean;
  daemon?: boolean;
  port?: number;
  mcpTransport?: string;
  ui?: boolean;
  autoStart?: boolean;
}

export interface UIAction {
  type: 'start' | 'stop' | 'restart' | 'logs' | 'status' | 'exit';
  processId?: string;
  options?: Record<string, any>;
}
