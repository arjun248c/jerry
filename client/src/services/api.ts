import axios from 'axios';
import { 
  Workflow, 
  NodeType, 
  ExecutionData, 
  WorkflowAnalytics, 
  WorkflowFolder,
  SearchFilters,
  ExecutionFilters,
  PaginatedResponse,
  SystemMetrics,
  ExportConfig,
  ImportResult
} from '../types';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for auth tokens (if needed)
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
    }
    return Promise.reject(error);
  }
);

// ─── Static fallback node types (used when server is unavailable) ───────────
export const FALLBACK_NODE_TYPES: NodeType[] = [
  {
    name: 'start',
    displayName: 'Start',
    description: 'Starting point of the workflow',
    group: 'Flow Control',
    inputs: [],
    outputs: ['main'],
    parameters: [],
    icon: '▶️',
    color: '#28a745'
  },
  {
    name: 'httpRequest',
    displayName: 'HTTP Request',
    description: 'Make HTTP requests to external APIs',
    group: 'Network',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      { name: 'url', displayName: 'URL', type: 'string', required: true, placeholder: 'https://api.example.com' },
      { name: 'method', displayName: 'Method', type: 'options', required: true, default: 'GET', options: [
        { name: 'GET', value: 'GET' }, { name: 'POST', value: 'POST' },
        { name: 'PUT', value: 'PUT' }, { name: 'DELETE', value: 'DELETE' },
        { name: 'PATCH', value: 'PATCH' }
      ]},
      { name: 'body', displayName: 'Request Body', type: 'json', required: false, placeholder: '{}' },
      { name: 'headers', displayName: 'Headers', type: 'json', required: false, placeholder: '{}' }
    ],
    icon: '🌐',
    color: '#007bff'
  },
  {
    name: 'webhook',
    displayName: 'Webhook',
    description: 'Receive data via HTTP webhook',
    group: 'Triggers',
    inputs: [],
    outputs: ['main'],
    parameters: [
      { name: 'path', displayName: 'Webhook Path', type: 'string', required: true, placeholder: '/my-webhook' }
    ],
    icon: '🔗',
    color: '#6f42c1'
  },
  {
    name: 'schedule',
    displayName: 'Schedule',
    description: 'Trigger workflow on a schedule',
    group: 'Triggers',
    inputs: [],
    outputs: ['main'],
    parameters: [
      { name: 'cron', displayName: 'Cron Expression', type: 'string', required: true, placeholder: '0 9 * * 1-5', description: 'e.g. "0 9 * * 1-5" for weekdays at 9am' }
    ],
    icon: '⏰',
    color: '#fd7e14'
  },
  {
    name: 'if',
    displayName: 'IF Condition',
    description: 'Branch workflow based on a condition',
    group: 'Flow Control',
    inputs: ['main'],
    outputs: ['true', 'false'],
    parameters: [
      { name: 'condition', displayName: 'Condition', type: 'code', required: true, placeholder: 'data.value > 10' }
    ],
    icon: '🔀',
    color: '#ffc107'
  },
  {
    name: 'set',
    displayName: 'Set Variable',
    description: 'Set or transform data variables',
    group: 'Data',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      { name: 'values', displayName: 'Values', type: 'json', required: true, placeholder: '{"key": "value"}' }
    ],
    icon: '📝',
    color: '#17a2b8'
  },
  {
    name: 'code',
    displayName: 'Code',
    description: 'Execute custom JavaScript code',
    group: 'Data',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      { name: 'code', displayName: 'JavaScript Code', type: 'code', required: true, placeholder: '// return { result: data }' }
    ],
    icon: '💻',
    color: '#343a40'
  },
  {
    name: 'delay',
    displayName: 'Delay',
    description: 'Wait for a specified amount of time',
    group: 'Flow Control',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      { name: 'duration', displayName: 'Duration (ms)', type: 'number', required: true, default: 1000 }
    ],
    icon: '⏳',
    color: '#6c757d'
  },
  {
    name: 'email',
    displayName: 'Send Email',
    description: 'Send emails via SMTP',
    group: 'Communication',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      { name: 'to', displayName: 'To', type: 'string', required: true, placeholder: 'recipient@example.com' },
      { name: 'subject', displayName: 'Subject', type: 'string', required: true },
      { name: 'body', displayName: 'Body', type: 'string', required: true }
    ],
    icon: '📧',
    color: '#dc3545'
  },
  {
    name: 'gmail',
    displayName: 'Send Gmail',
    description: 'Send emails via Gmail API',
    group: 'Communication',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      { name: 'to', displayName: 'To', type: 'string', required: true },
      { name: 'subject', displayName: 'Subject', type: 'string', required: true },
      { name: 'body', displayName: 'Body', type: 'string', required: true },
      { name: 'appPassword', displayName: 'Gmail App Password', type: 'string', required: true }
    ],
    icon: '📬',
    color: '#ea4335'
  },
  {
    name: 'gmailReader',
    displayName: 'Read Gmail',
    description: 'Read emails from Gmail inbox',
    group: 'Communication',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      { name: 'user', displayName: 'Gmail Address', type: 'string', required: true },
      { name: 'appPassword', displayName: 'App Password', type: 'string', required: true },
      { name: 'limit', displayName: 'Max Emails', type: 'number', required: false, default: 10 }
    ],
    icon: '📥',
    color: '#fbbc04'
  },
  {
    name: 'whatsapp',
    displayName: 'WhatsApp',
    description: 'Send WhatsApp messages via Cloud API',
    group: 'Communication',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      { name: 'to', displayName: 'Phone Number', type: 'string', required: true, placeholder: '+1234567890' },
      { name: 'message', displayName: 'Message', type: 'string', required: true },
      { name: 'accessToken', displayName: 'Access Token', type: 'string', required: true },
      { name: 'phoneNumberId', displayName: 'Phone Number ID', type: 'string', required: true }
    ],
    icon: '💬',
    color: '#25D366'
  },
  {
    name: 'ai',
    displayName: 'AI / GPT',
    description: 'Send prompts to OpenAI GPT models',
    group: 'AI',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      { name: 'prompt', displayName: 'Prompt', type: 'string', required: true },
      { name: 'model', displayName: 'Model', type: 'options', required: false, default: 'gpt-3.5-turbo', options: [
        { name: 'GPT-4o', value: 'gpt-4o' },
        { name: 'GPT-4', value: 'gpt-4' },
        { name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
      ]},
      { name: 'apiKey', displayName: 'OpenAI API Key', type: 'string', required: true }
    ],
    icon: '🤖',
    color: '#10a37f'
  },
  {
    name: 'database',
    displayName: 'Database Query',
    description: 'Execute SQL database queries',
    group: 'Data',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      { name: 'query', displayName: 'SQL Query', type: 'code', required: true, placeholder: 'SELECT * FROM users' },
      { name: 'connectionString', displayName: 'Connection String', type: 'string', required: true }
    ],
    icon: '🗄️',
    color: '#6610f2'
  },
  {
    name: 'transform',
    displayName: 'Transform Data',
    description: 'Map and reshape data objects',
    group: 'Data',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      { name: 'mapping', displayName: 'Field Mapping', type: 'json', required: true, placeholder: '{"newKey": "{{oldKey}}"}' }
    ],
    icon: '🔄',
    color: '#20c997'
  },
  {
    name: 'filter',
    displayName: 'Filter',
    description: 'Filter items from an array',
    group: 'Data',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      { name: 'condition', displayName: 'Filter Condition', type: 'code', required: true, placeholder: 'item.status === "active"' }
    ],
    icon: '🔍',
    color: '#0dcaf0'
  },
  {
    name: 'split',
    displayName: 'Split',
    description: 'Split data array into individual items',
    group: 'Data',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      { name: 'field', displayName: 'Array Field', type: 'string', required: false, placeholder: 'items' }
    ],
    icon: '✂️',
    color: '#adb5bd'
  },
  {
    name: 'loop',
    displayName: 'Loop',
    description: 'Iterate over array items',
    group: 'Flow Control',
    inputs: ['main'],
    outputs: ['item', 'done'],
    parameters: [
      { name: 'arrayField', displayName: 'Array Field', type: 'string', required: true }
    ],
    icon: '🔁',
    color: '#e83e8c'
  },
  {
    name: 'file',
    displayName: 'File Operations',
    description: 'Read or write files',
    group: 'Data',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      { name: 'operation', displayName: 'Operation', type: 'options', required: true, default: 'read', options: [
        { name: 'Read', value: 'read' }, { name: 'Write', value: 'write' }
      ]},
      { name: 'path', displayName: 'File Path', type: 'string', required: true }
    ],
    icon: '📁',
    color: '#fd7e14'
  },
  {
    name: 'youtube',
    displayName: 'YouTube',
    description: 'Interact with YouTube Data API',
    group: 'Social Media',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      { name: 'operation', displayName: 'Operation', type: 'options', required: true, default: 'search', options: [
        { name: 'Search Videos', value: 'search' },
        { name: 'Get Video Details', value: 'getVideo' },
        { name: 'Get Channel Info', value: 'getChannel' }
      ]},
      { name: 'apiKey', displayName: 'YouTube API Key', type: 'string', required: true },
      { name: 'query', displayName: 'Search Query', type: 'string', required: false }
    ],
    icon: '▶️',
    color: '#ff0000'
  },
  {
    name: 'cache',
    displayName: 'Cache',
    description: 'Cache data for reuse',
    group: 'Data',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      { name: 'key', displayName: 'Cache Key', type: 'string', required: true },
      { name: 'ttl', displayName: 'TTL (seconds)', type: 'number', required: false, default: 300 }
    ],
    icon: '💾',
    color: '#6c757d'
  }
];

export const api = {
  // Workflow Management
  async getWorkflows(filters?: SearchFilters): Promise<Workflow[]> {
    const params = new URLSearchParams();
    if (filters?.query) params.append('query', filters.query);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.tags?.length) params.append('tags', filters.tags.join(','));
    if (filters?.folderId) params.append('folderId', filters.folderId);
    
    const response = await axiosInstance.get(`/workflows?${params}`);
    return response.data;
  },

  async getWorkflow(workflowId: string): Promise<Workflow> {
    const response = await axiosInstance.get(`/workflows/${workflowId}`);
    return response.data;
  },

  async saveWorkflow(workflow: Workflow): Promise<Workflow> {
    if (workflow.id && !workflow.id.startsWith('workflow_')) {
      const response = await axiosInstance.put(`/workflows/${workflow.id}`, workflow);
      return response.data;
    }
    const response = await axiosInstance.post('/workflows', workflow);
    return response.data;
  },

  async deleteWorkflow(workflowId: string): Promise<void> {
    await axiosInstance.delete(`/workflows/${workflowId}`);
  },

  async duplicateWorkflow(workflowId: string, name?: string): Promise<Workflow> {
    const response = await axiosInstance.post(`/workflows/${workflowId}/duplicate`, { name });
    return response.data;
  },

  async toggleWorkflowStatus(workflowId: string): Promise<Workflow> {
    const response = await axiosInstance.patch(`/workflows/${workflowId}/toggle`);
    return response.data;
  },

  // Workflow Execution
  async executeWorkflow(workflowId: string, triggerData?: any): Promise<ExecutionData> {
    const response = await axiosInstance.post(`/workflows/${workflowId}/execute`, {
      triggerData
    });
    return response.data;
  },

  async stopExecution(executionId: string): Promise<void> {
    await axiosInstance.post(`/executions/${executionId}/stop`);
  },

  async getExecutions(filters?: ExecutionFilters): Promise<PaginatedResponse<ExecutionData>> {
    const params = new URLSearchParams();
    if (filters?.workflowId) params.append('workflowId', filters.workflowId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.query) params.append('query', filters.query);
    if (filters?.dateRange) {
      params.append('startDate', filters.dateRange.start.toISOString());
      params.append('endDate', filters.dateRange.end.toISOString());
    }
    
    const response = await axiosInstance.get(`/executions?${params}`);
    const items: ExecutionData[] = Array.isArray(response.data) ? response.data : response.data?.data || [];
    return {
      data: items,
      total: items.length,
      page: 1,
      pageSize: 50
    } as PaginatedResponse<ExecutionData>;
  },

  async getExecution(executionId: string): Promise<ExecutionData> {
    const response = await axiosInstance.get(`/executions/${executionId}`);
    return response.data;
  },

  async getExecutionLogs(executionId: string): Promise<string[]> {
    const response = await axiosInstance.get(`/executions/${executionId}/logs`);
    return response.data;
  },

  // Node Types — returns fallback list when server is unreachable
  async getNodeTypes(): Promise<NodeType[]> {
    try {
      const response = await axiosInstance.get('/node-types');
      const data: NodeType[] = response.data;
      // If backend returns empty array, still use fallback
      if (!Array.isArray(data) || data.length === 0) return FALLBACK_NODE_TYPES;
      return data;
    } catch {
      console.warn('[Jerry] Backend unavailable — using built-in node types');
      return FALLBACK_NODE_TYPES;
    }
  },

  async getNodeType(nodeTypeName: string): Promise<NodeType> {
    const response = await axiosInstance.get(`/node-types/${nodeTypeName}`);
    return response.data;
  },

  // Templates
  async getTemplates(): Promise<any[]> {
    const response = await axiosInstance.get('/templates');
    return response.data;
  },

  async importTemplate(filename: string): Promise<Workflow> {
    const response = await axiosInstance.post(`/templates/${filename}/import`);
    return response.data.workflow;
  },

  // Folders
  async getFolders(): Promise<WorkflowFolder[]> {
    const response = await axiosInstance.get('/folders');
    return response.data;
  },

  async createFolder(folder: Omit<WorkflowFolder, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkflowFolder> {
    const response = await axiosInstance.post('/folders', folder);
    return response.data;
  },

  async updateFolder(folderId: string, updates: Partial<WorkflowFolder>): Promise<WorkflowFolder> {
    const response = await axiosInstance.put(`/folders/${folderId}`, updates);
    return response.data;
  },

  async deleteFolder(folderId: string): Promise<void> {
    await axiosInstance.delete(`/folders/${folderId}`);
  },

  // Analytics
  async getWorkflowAnalytics(workflowId: string, period: 'day' | 'week' | 'month' | 'year' = 'week'): Promise<WorkflowAnalytics> {
    const response = await axiosInstance.get(`/analytics/workflows/${workflowId}?period=${period}`);
    return response.data;
  },

  async getDashboardAnalytics(): Promise<{
    totalWorkflows: number;
    activeWorkflows: number;
    totalExecutions: number;
    successRate: number;
    recentExecutions: ExecutionData[];
    popularNodes: { nodeType: string; count: number }[];
  }> {
    const response = await axiosInstance.get('/analytics/dashboard');
    return response.data;
  },

  async getSystemMetrics(): Promise<SystemMetrics> {
    const response = await axiosInstance.get('/system/metrics');
    return response.data;
  },

  // Import/Export
  async exportWorkflows(config: ExportConfig): Promise<Blob> {
    const response = await axiosInstance.post('/export', config, {
      responseType: 'blob'
    });
    return response.data;
  },

  async importWorkflows(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axiosInstance.post('/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Webhooks
  async getWebhookUrl(workflowId: string): Promise<string> {
    const response = await axiosInstance.get(`/webhooks/${workflowId}/url`);
    return response.data.url;
  },

  async testWebhook(workflowId: string, testData: any): Promise<any> {
    const response = await axiosInstance.post(`/webhooks/${workflowId}/test`, testData);
    return response.data;
  },

  // Credentials Management
  async getCredentials(): Promise<any[]> {
    const response = await axiosInstance.get('/credentials');
    return response.data;
  },

  async saveCredential(credential: any): Promise<any> {
    const response = await axiosInstance.post('/credentials', credential);
    return response.data;
  },

  async deleteCredential(credentialId: string): Promise<void> {
    await axiosInstance.delete(`/credentials/${credentialId}`);
  },

  // System Health
  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    uptime: number;
    database: boolean;
    websocket: boolean;
  }> {
    const response = await axiosInstance.get('/health');
    return response.data;
  },

  // Search
  async searchWorkflows(query: string, filters?: SearchFilters): Promise<Workflow[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (filters?.tags?.length) params.append('tags', filters.tags.join(','));
    if (filters?.status) params.append('status', filters.status);
    
    const response = await axiosInstance.get(`/search/workflows?${params}`);
    return response.data;
  },

  async searchExecutions(query: string, filters?: ExecutionFilters): Promise<ExecutionData[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (filters?.workflowId) params.append('workflowId', filters.workflowId);
    if (filters?.status) params.append('status', filters.status);
    
    const response = await axiosInstance.get(`/search/executions?${params}`);
    return response.data;
  },

  // Batch Operations
  async batchDeleteWorkflows(workflowIds: string[]): Promise<void> {
    await axiosInstance.post('/workflows/batch/delete', { workflowIds });
  },

  async batchToggleWorkflows(workflowIds: string[], active: boolean): Promise<void> {
    await axiosInstance.post('/workflows/batch/toggle', { workflowIds, active });
  },

  async batchExecuteWorkflows(workflowIds: string[], triggerData?: any): Promise<ExecutionData[]> {
    const response = await axiosInstance.post('/workflows/batch/execute', { 
      workflowIds, 
      triggerData 
    });
    return response.data;
  },

  // Scheduling
  async getScheduledWorkflows(): Promise<Workflow[]> {
    const response = await axiosInstance.get('/schedules');
    return response.data;
  },

  async updateWorkflowSchedule(workflowId: string, schedule: any): Promise<Workflow> {
    const response = await axiosInstance.put(`/workflows/${workflowId}/schedule`, schedule);
    return response.data;
  },

  // Notifications
  async getNotificationSettings(): Promise<any> {
    const response = await axiosInstance.get('/notifications/settings');
    return response.data;
  },

  async updateNotificationSettings(settings: any): Promise<any> {
    const response = await axiosInstance.put('/notifications/settings', settings);
    return response.data;
  },

  async testNotification(config: any): Promise<void> {
    await axiosInstance.post('/notifications/test', config);
  }
};

// Utility functions
export const apiUtils = {
  isOnline: () => navigator.onLine,
  
  async ping(): Promise<boolean> {
    try {
      await axiosInstance.get('/health', { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  },
  
  formatError: (error: any): string => {
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
      return 'Cannot connect to server. Please make sure the backend is running on port 3001.';
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  },
  
  downloadBlob: (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};

export default api;