import React, { useState, useEffect } from 'react';
import { Workflow } from '../types';
import { api } from '../services/api';
import './WorkflowList.css';

interface WorkflowListProps {
  onSelectWorkflow: (workflow: Workflow) => void;
  onCreateWorkflow: () => void;
}

export const WorkflowList: React.FC<WorkflowListProps> = ({ onSelectWorkflow, onCreateWorkflow }) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [executions, setExecutions] = useState<Record<string, any[]>>({});

  useEffect(() => {
    loadWorkflows();
    loadExecutions();
  }, []);

  const loadWorkflows = async () => {
    try {
      const data = await api.getWorkflows();
      setWorkflows(data);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExecutions = async () => {
    try {
      const result = await api.getExecutions();
      const executionsByWorkflow: Record<string, any[]> = {};
      
      result.data.forEach((execution: any) => {
        if (!executionsByWorkflow[execution.workflowId]) {
          executionsByWorkflow[execution.workflowId] = [];
        }
        executionsByWorkflow[execution.workflowId].push(execution);
      });
      
      setExecutions(executionsByWorkflow);
    } catch (error) {
      console.error('Failed to load executions:', error);
    }
  };

  const deleteWorkflow = async (workflowId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      try {
        await api.deleteWorkflow(workflowId);
        setWorkflows(workflows.filter(w => w.id !== workflowId));
      } catch (error) {
        console.error('Failed to delete workflow:', error);
        alert('Failed to delete workflow');
      }
    }
  };

  const toggleWorkflowStatus = async (workflow: Workflow, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      const updatedWorkflow = { ...workflow, active: !workflow.active };
      await api.saveWorkflow(updatedWorkflow);
      setWorkflows(workflows.map(w => w.id === workflow.id ? updatedWorkflow : w));
    } catch (error) {
      console.error('Failed to update workflow status:', error);
      alert('Failed to update workflow status');
    }
  };

  if (loading) {
    return <div className="loading">Loading workflows...</div>;
  }

  return (
    <div className="workflow-list">
      <div className="header">
        <h2>Workflows</h2>
        <button onClick={onCreateWorkflow} className="create-btn">
          Create New Workflow
        </button>
      </div>

      <div className="workflows">
        {workflows.length === 0 ? (
          <div className="empty-state">
            <p>No workflows found. Create your first workflow to get started.</p>
          </div>
        ) : (
          workflows.map(workflow => (
            <div
              key={workflow.id}
              className="workflow-item"
              onClick={() => onSelectWorkflow(workflow)}
            >
              <div className="workflow-header">
                <div className="workflow-name">{workflow.name}</div>
                <div className="workflow-actions">
                  <button 
                    className={`toggle-btn ${workflow.active ? 'active' : 'inactive'}`}
                    onClick={(e) => toggleWorkflowStatus(workflow, e)}
                    title={workflow.active ? 'Deactivate' : 'Activate'}
                  >
                    {workflow.active ? '●' : '○'}
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={(e) => deleteWorkflow(workflow.id, e)}
                    title="Delete workflow"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="workflow-meta">
                <span className={`status ${workflow.active ? 'active' : 'inactive'}`}>
                  {workflow.active ? 'Active' : 'Inactive'}
                </span>
                <span className="node-count">{workflow.nodes.length} nodes</span>
                <span className="execution-count">
                  {executions[workflow.id]?.length || 0} executions
                </span>
              </div>
              <div className="workflow-date">
                Updated: {new Date(workflow.updatedAt).toLocaleDateString()}
              </div>
              {executions[workflow.id] && executions[workflow.id].length > 0 && (
                <div className="last-execution">
                  Last run: {executions[workflow.id][0].status} - {new Date(executions[workflow.id][0].startedAt).toLocaleString()}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};