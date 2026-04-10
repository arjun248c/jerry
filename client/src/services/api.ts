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
  timeout: 30000,
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
      // Handle unauthorized access
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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
    // Use PUT to update existing saved workflows (those with UUID IDs from the DB).
    // Use POST for brand new temp-ID workflows (e.g. those starting with 'workflow_').
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
    // Backend returns a plain array — wrap it into PaginatedResponse shape
    const items: ExecutionData[] = Array.isArray(response.data) ? response.data : response.data?.data || [];
    return {
      data: items,
      total: items.length,
      page: 1,
      limit: 50,
      hasMore: false
    } as unknown as PaginatedResponse<ExecutionData>;
  },

  async getExecution(executionId: string): Promise<ExecutionData> {
    const response = await axiosInstance.get(`/executions/${executionId}`);
    return response.data;
  },

  async getExecutionLogs(executionId: string): Promise<string[]> {
    const response = await axiosInstance.get(`/executions/${executionId}/logs`);
    return response.data;
  },

  // Node Types
  async getNodeTypes(): Promise<NodeType[]> {
    const response = await axiosInstance.get('/node-types');
    return response.data;
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
      await api.checkHealth();
      return true;
    } catch {
      return false;
    }
  },
  
  formatError: (error: any): string => {
    if (error.response?.data?.message) {
      return error.response.data.message;
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