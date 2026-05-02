export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  parameters: Record<string, any>;
  disabled?: boolean;
  notes?: string;
  version?: number;
}

export interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceOutput?: string;
  targetInput?: string;
  condition?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  createdAt: Date;
  updatedAt: Date;
  version?: number;
  tags?: string[];
  folderId?: string;
  schedule?: ScheduleConfig;
  settings?: WorkflowSettings;
}

export interface WorkflowSettings {
  timeout: number;
  retryCount: number;
  parallelExecution: boolean;
  errorHandling: 'stop' | 'continue' | 'retry';
  notifications: NotificationConfig[];
}

export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook';
  events: ('success' | 'error' | 'start')[];
  config: Record<string, any>;
}

export interface ScheduleConfig {
  enabled: boolean;
  cron: string;
  timezone: string;
}

export interface NodeType {
  name: string;
  displayName: string;
  description: string;
  group: string;
  inputs: string[];
  outputs: string[];
  parameters: NodeParameter[];
  icon?: string;
  color?: string;
  version?: string;
  deprecated?: boolean;
}

export interface NodeParameter {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'options' | 'json' | 'code' | 'file' | 'credential';
  required: boolean;
  default?: any;
  options?: { name: string; value: any }[];
  validation?: ParameterValidation;
  description?: string;
  placeholder?: string;
}

export interface ParameterValidation {
  min?: number;
  max?: number;
  pattern?: string;
  custom?: string;
}

export interface WorkflowFolder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  workflow: Partial<Workflow>;
  tags: string[];
  popularity: number;
}

export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  autoSave: boolean;
  gridSnap: boolean;
  showMinimap: boolean;
  debugMode: boolean;
}

export interface ExecutionData {
  id: string;
  workflowId: string;
  status: 'queued' | 'running' | 'success' | 'error' | 'cancelled';
  startedAt: Date;
  finishedAt?: Date;
  data: Record<string, any>;
  error?: string;
}

export interface SearchFilters {
  query?: string;
  tags?: string[];
  status?: string;
  dateRange?: { start: Date; end: Date };
  folderId?: string;
}

export interface ExecutionFilters {
  workflowId?: string;
  status?: string;
  query?: string;
  dateRange?: { start: Date; end: Date };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface WorkflowAnalytics {
  workflowId: string;
  period: 'day' | 'week' | 'month' | 'year';
  totalExecutions: number;
  successCount: number;
  errorCount: number;
  avgDuration: number;
  executionHistory: { date: string; count: number; success: number }[];
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeWorkflows: number;
  queuedExecutions: number;
  uptime: number;
}

export interface ExportConfig {
  workflowIds?: string[];
  includeExecutions?: boolean;
  format?: 'json' | 'yaml';
}

export interface ImportResult {
  imported: number;
  failed: number;
  errors?: string[];
  workflows?: Workflow[];
}