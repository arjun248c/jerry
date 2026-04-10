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
  version: number;
  tags?: string[];
  folderId?: string;
  schedule?: ScheduleConfig;
  settings: WorkflowSettings;
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

export interface ExecutionData {
  id: string;
  workflowId: string;
  status: 'queued' | 'running' | 'success' | 'error' | 'cancelled';
  startedAt: Date;
  finishedAt?: Date;
  data: Record<string, any>;
  error?: string;
  nodeExecutions: NodeExecution[];
  metrics: ExecutionMetrics;
}

export interface NodeExecution {
  nodeId: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  startedAt?: Date;
  finishedAt?: Date;
  inputData?: any;
  outputData?: any;
  error?: string;
  executionTime?: number;
}

export interface ExecutionMetrics {
  totalTime: number;
  nodeCount: number;
  successCount: number;
  errorCount: number;
  dataProcessed: number;
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

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  permissions: string[];
  createdAt: Date;
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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface SearchFilters {
  query?: string;
  tags?: string[];
  status?: string;
  dateRange?: { start: Date; end: Date };
  folderId?: string;
}

export interface ExecutionFilters extends SearchFilters {
  workflowId?: string;
  status?: 'queued' | 'running' | 'success' | 'error' | 'cancelled';
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
}

export interface Credential {
  id: string;
  name: string;
  type: string;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Node-specific interfaces
export interface HttpRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
}

export interface DatabaseConfig {
  type: 'sqlite' | 'mysql' | 'postgresql' | 'mongodb';
  connection: string;
  query: string;
  parameters?: any[];
}

export interface EmailConfig {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: string[];
}

export interface ScheduleNodeConfig {
  cron: string;
  timezone: string;
  enabled: boolean;
}

export interface FileConfig {
  path: string;
  operation: 'read' | 'write' | 'append' | 'delete';
  format: 'json' | 'csv' | 'xml' | 'txt';
  encoding?: string;
}

export interface TransformConfig {
  mappings: FieldMapping[];
  conditions?: TransformCondition[];
}

export interface FieldMapping {
  source: string;
  target: string;
  transform?: string;
}

export interface TransformCondition {
  field: string;
  operator: string;
  value: any;
  action: 'include' | 'exclude' | 'modify';
}

export interface LoopConfig {
  items: string;
  batchSize?: number;
  parallel?: boolean;
  maxIterations?: number;
}

export interface CacheConfig {
  key: string;
  ttl?: number;
  operation: 'get' | 'set' | 'delete' | 'clear';
}

export interface AIConfig {
  provider: 'openai' | 'claude' | 'custom';
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

// Analytics and monitoring
export interface WorkflowAnalytics {
  workflowId: string;
  period: 'day' | 'week' | 'month' | 'year';
  executions: number;
  successRate: number;
  avgExecutionTime: number;
  errorRate: number;
  dataProcessed: number;
  popularNodes: { nodeType: string; count: number }[];
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  activeExecutions: number;
  queuedExecutions: number;
  totalWorkflows: number;
  activeWorkflows: number;
}

// Export/Import
export interface ExportConfig {
  format: 'json' | 'yaml';
  includeCredentials: boolean;
  includeExecutions: boolean;
  workflowIds?: string[];
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  warnings: string[];
}