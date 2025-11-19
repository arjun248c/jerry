import axios from 'axios';
import { Workflow, NodeType } from '../types';

const API_BASE = 'http://localhost:3001/api';

export const api = {
  async getWorkflows(): Promise<Workflow[]> {
    const response = await axios.get(`${API_BASE}/workflows`);
    return response.data;
  },

  async saveWorkflow(workflow: Workflow): Promise<Workflow> {
    const response = await axios.post(`${API_BASE}/workflows`, workflow);
    return response.data;
  },

  async deleteWorkflow(workflowId: string): Promise<void> {
    await axios.delete(`${API_BASE}/workflows/${workflowId}`);
  },

  async executeWorkflow(workflowId: string, triggerData?: any): Promise<any> {
    const response = await axios.post(`${API_BASE}/workflows/${workflowId}/execute`, {
      triggerData
    });
    return response.data;
  },

  async getExecutions(workflowId?: string): Promise<any[]> {
    const url = workflowId 
      ? `${API_BASE}/workflows/${workflowId}/executions`
      : `${API_BASE}/executions`;
    const response = await axios.get(url);
    return response.data;
  },

  async getNodeTypes(): Promise<NodeType[]> {
    const response = await axios.get(`${API_BASE}/node-types`);
    return response.data;
  },

  async checkHealth(): Promise<any> {
    const response = await axios.get(`${API_BASE}/health`);
    return response.data;
  }
};