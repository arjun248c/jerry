import React, { useState, useEffect } from 'react';
import { Workflow, ExecutionData, SearchFilters } from '../types';
import { api, apiUtils } from '../services/api';
import './WorkflowDashboard.css';

interface WorkflowDashboardProps {
  onOpenWorkflow: (workflow: Workflow) => void;
  onCreateWorkflow: () => void;
}

// ─── Local-storage helpers ───────────────────────────────────────────────────
const LS_WORKFLOWS_KEY = 'jerry_local_workflows';

function loadLocalWorkflows(): Workflow[] {
  try {
    const raw = localStorage.getItem(LS_WORKFLOWS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalWorkflows(workflows: Workflow[]) {
  try {
    localStorage.setItem(LS_WORKFLOWS_KEY, JSON.stringify(workflows));
  } catch {}
}

export const WorkflowDashboard: React.FC<WorkflowDashboardProps> = ({
  onOpenWorkflow,
  onCreateWorkflow
}) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<ExecutionData[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [importingTemplate, setImportingTemplate] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    status: '',
    tags: []
  });

  useEffect(() => {
    checkServerAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkServerAndLoad = async () => {
    setLoading(true);
    setError(null);

    // In production (no local backend), skip the ping and go straight to local mode
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      setServerOnline(null); // null = hide all banners
      const local = loadLocalWorkflows();
      setWorkflows(local);
      setExecutions([]);
      setLoading(false);
      return;
    }

    const online = await apiUtils.ping();
    setServerOnline(online);

    if (online) {
      await loadData();
      loadTemplates();
    } else {
      // Fall back to locally cached workflows
      const local = loadLocalWorkflows();
      setWorkflows(local);
      setExecutions([]);
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [workflowsData, executionsData] = await Promise.all([
        api.getWorkflows(),
        api.getExecutions()
      ]);
      setWorkflows(workflowsData);
      // Persist locally so offline mode works next time
      saveLocalWorkflows(workflowsData);
      const execArr = Array.isArray(executionsData)
        ? executionsData
        : (executionsData as any).data ?? [];
      setExecutions(execArr);
    } catch (err: any) {
      const msg = apiUtils.formatError(err);
      setError(msg);
      // Still show cached workflows
      const local = loadLocalWorkflows();
      setWorkflows(local);
      setExecutions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const tmpl = await api.getTemplates();
      setTemplates(tmpl);
    } catch {
      // templates are optional — silently ignore
    }
  };

  const importTemplate = async (filename: string, templateName: string) => {
    setImportingTemplate(filename);
    setImportSuccess(null);
    try {
      await api.importTemplate(filename);
      setImportSuccess(`"${templateName}" imported! Find it in your workflows list.`);
      await loadData();
      setTimeout(() => setImportSuccess(null), 5000);
    } catch (err: any) {
      setError(`Failed to import template: ${apiUtils.formatError(err)}`);
    } finally {
      setImportingTemplate(null);
    }
  };

  const filteredWorkflows = workflows.filter(workflow => {
    if (filters.query && !workflow.name.toLowerCase().includes(filters.query.toLowerCase())) {
      return false;
    }
    if (filters.status && workflow.active.toString() !== filters.status) {
      return false;
    }
    return true;
  });

  const getWorkflowStats = (workflowId: string) => {
    const workflowExecutions = executions.filter(e => e.workflowId === workflowId);
    const successCount = workflowExecutions.filter(e => e.status === 'success').length;
    const totalCount = workflowExecutions.length;
    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

    return {
      totalExecutions: totalCount,
      successRate: Math.round(successRate),
      lastExecution: workflowExecutions[0]?.startedAt
    };
  };

  const duplicateWorkflow = async (workflow: Workflow) => {
    const newWorkflow: Workflow = {
      ...workflow,
      id: `workflow_${Date.now()}`,
      name: `${workflow.name} (Copy)`,
      active: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (serverOnline) {
      try {
        await api.saveWorkflow(newWorkflow);
        await loadData();
      } catch (err: any) {
        setError(`Failed to duplicate workflow: ${apiUtils.formatError(err)}`);
      }
    } else {
      // Offline: save locally
      const updated = [...workflows, newWorkflow];
      setWorkflows(updated);
      saveLocalWorkflows(updated);
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    if (!window.confirm('Are you sure you want to delete this workflow?')) return;

    if (serverOnline) {
      try {
        await api.deleteWorkflow(workflowId);
        await loadData();
      } catch (err: any) {
        setError(`Failed to delete workflow: ${apiUtils.formatError(err)}`);
      }
    } else {
      const updated = workflows.filter(w => w.id !== workflowId);
      setWorkflows(updated);
      saveLocalWorkflows(updated);
    }
  };

  const toggleWorkflowStatus = async (workflow: Workflow) => {
    const updated = { ...workflow, active: !workflow.active };
    if (serverOnline) {
      try {
        await api.saveWorkflow(updated);
        await loadData();
      } catch (err: any) {
        setError(`Failed to update workflow: ${apiUtils.formatError(err)}`);
      }
    } else {
      const updatedList = workflows.map(w => w.id === workflow.id ? updated : w);
      setWorkflows(updatedList);
      saveLocalWorkflows(updatedList);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Connecting to server...</p>
      </div>
    );
  }

  // Only show server banners in development
  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <div className="workflow-dashboard">
      {/* Server status banners — dev only */}
      {isDev && serverOnline === false && (
        <div className="server-banner offline">
          <span>⚠️ <strong>Server Offline</strong> — Working in local mode. Start the backend with <code>npm run dev</code> to sync workflows.</span>
          <button className="retry-btn" onClick={checkServerAndLoad}>🔄 Retry</button>
        </div>
      )}
      {isDev && serverOnline === true && (
        <div className="server-banner online">
          ✅ <strong>Server Connected</strong> — All changes are saved to the database.
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="error-banner">
          ❌ {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}>✕</button>
        </div>
      )}

      <div className="dashboard-header">
        <div className="header-content">
          <h1>Workflow Dashboard</h1>
          <div className="header-actions">
            <button
              className="btn-secondary"
              onClick={() => setShowTemplates(true)}
              title="Browse ready-made workflow templates"
            >
              📋 Templates
            </button>
            <button className="btn-primary" onClick={onCreateWorkflow}>
              ➕ Create Workflow
            </button>
          </div>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-value">{workflows.length}</div>
            <div className="stat-label">Total Workflows</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{workflows.filter(w => w.active).length}</div>
            <div className="stat-label">Active Workflows</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{executions.length}</div>
            <div className="stat-label">Total Executions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {executions.length > 0
                ? Math.round((executions.filter(e => e.status === 'success').length / executions.length) * 100)
                : 0}%
            </div>
            <div className="stat-label">Success Rate</div>
          </div>
        </div>
      </div>

      <div className="dashboard-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search workflows..."
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div className="view-toggle">
          <button
            className={`view-btn ${view === 'grid' ? 'active' : ''}`}
            onClick={() => setView('grid')}
          >
            ⊞
          </button>
          <button
            className={`view-btn ${view === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}
          >
            ☰
          </button>
        </div>
      </div>

      <div className={`workflows-container ${view}`}>
        {filteredWorkflows.map(workflow => {
          const stats = getWorkflowStats(workflow.id);

          return (
            <div key={workflow.id} className="workflow-card">
              <div className="card-header">
                <div className="workflow-info">
                  <h3 className="workflow-name">{workflow.name}</h3>
                  <p className="workflow-description">{workflow.description || 'No description'}</p>
                </div>
                <div className="workflow-status">
                  <span className={`status-badge ${workflow.active ? 'active' : 'inactive'}`}>
                    {workflow.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="card-stats">
                <div className="stat-item">
                  <span className="stat-number">{workflow.nodes.length}</span>
                  <span className="stat-text">Nodes</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{stats.totalExecutions}</span>
                  <span className="stat-text">Executions</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{stats.successRate}%</span>
                  <span className="stat-text">Success Rate</span>
                </div>
              </div>

              <div className="card-meta">
                <div className="workflow-tags">
                  {workflow.tags?.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
                <div className="workflow-dates">
                  <small>Updated: {new Date(workflow.updatedAt).toLocaleDateString()}</small>
                </div>
              </div>

              <div className="card-actions">
                <button
                  className="btn-secondary"
                  onClick={() => onOpenWorkflow(workflow)}
                >
                  ✏️ Edit
                </button>
                <button
                  className={`btn-secondary ${workflow.active ? 'btn-warning' : 'btn-success'}`}
                  onClick={() => toggleWorkflowStatus(workflow)}
                >
                  {workflow.active ? '⏸️ Deactivate' : '▶️ Activate'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => duplicateWorkflow(workflow)}
                >
                  📋 Duplicate
                </button>
                <button
                  className="btn-danger"
                  onClick={() => deleteWorkflow(workflow.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          );
        })}

        {filteredWorkflows.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No workflows found</h3>
            <p>Create your first workflow or import a ready-made template</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={onCreateWorkflow}>
                ➕ Create Workflow
              </button>
              {serverOnline && (
                <button className="btn-secondary" onClick={() => setShowTemplates(true)}>
                  📋 Browse Templates
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <div
          className="modal-overlay"
          onClick={() => setShowTemplates(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface-color, #1e1e2e)',
              borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '680px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)', color: 'var(--text-color, #cdd6f4)',
              maxHeight: '80vh', overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>📋 Workflow Templates</h2>
              <button
                onClick={() => setShowTemplates(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'inherit', padding: '4px 8px' }}
              >✕</button>
            </div>

            {importSuccess && (
              <div style={{
                background: 'rgba(166,227,161,0.15)', border: '1px solid #a6e3a1',
                borderRadius: '8px', padding: '12px 16px', marginBottom: '20px',
                color: '#a6e3a1', fontWeight: 500
              }}>
                ✅ {importSuccess}
              </div>
            )}

            {templates.length === 0 ? (
              <p style={{ opacity: 0.6, textAlign: 'center', padding: '40px' }}>No templates available</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {templates.map((tmpl: any) => (
                  <div
                    key={tmpl.filename}
                    style={{
                      background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
                      padding: '20px', border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 600 }}>
                          {tmpl.name}
                        </h3>
                        <p style={{ margin: '0 0 10px', opacity: 0.7, fontSize: '0.875rem', lineHeight: '1.5' }}>
                          {tmpl.description}
                        </p>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {tmpl.tags?.map((tag: string) => (
                            <span key={tag} style={{
                              background: 'rgba(137,180,250,0.15)', color: '#89b4fa',
                              borderRadius: '20px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 500
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        className="btn-primary"
                        disabled={importingTemplate === tmpl.filename}
                        onClick={() => importTemplate(tmpl.filename, tmpl.name)}
                        style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        {importingTemplate === tmpl.filename ? '⏳ Importing...' : '⬇️ Import'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{
              marginTop: '24px', padding: '16px', background: 'rgba(249,226,175,0.08)',
              border: '1px solid rgba(249,226,175,0.25)', borderRadius: '10px', fontSize: '0.8rem', opacity: 0.85
            }}>
              <strong>💡 After importing:</strong> Open the workflow, fill in your credentials
              (Gmail App Password, WhatsApp Access Token), then activate it.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};