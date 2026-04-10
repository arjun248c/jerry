import React, { useState, useEffect } from 'react';
import { WorkflowDashboard } from './components/WorkflowDashboard';
import { EnhancedWorkflowEditor } from './components/EnhancedWorkflowEditor';
import { WorkflowTemplates } from './components/WorkflowTemplates';
import { Workflow, WorkflowTemplate, AppSettings } from './types';
import { api } from './services/api';
import './App.css';

type AppView = 'dashboard' | 'editor' | 'templates';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'light',
    language: 'en',
    autoSave: true,
    gridSnap: true,
    showMinimap: true,
    debugMode: false
  });

  useEffect(() => {
    loadSettings();
    // Apply theme on startup
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    saveSettings();
  }, [settings]);

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('app-settings');
    if (savedSettings) {
      setSettings({ ...settings, ...JSON.parse(savedSettings) });
    }
  };

  const saveSettings = () => {
    localStorage.setItem('app-settings', JSON.stringify(settings));
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleOpenWorkflow = (workflow: Workflow) => {
    setCurrentWorkflow(workflow);
    setCurrentView('editor');
  };

  const handleCreateWorkflow = () => {
    const newWorkflow: Workflow = {
      id: `workflow_${Date.now()}`,
      name: 'New Workflow',
      description: '',
      active: false,
      nodes: [],
      connections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      tags: [],
      settings: {
        timeout: 300000, // 5 minutes
        retryCount: 3,
        parallelExecution: false,
        errorHandling: 'stop',
        notifications: []
      }
    };
    setCurrentWorkflow(newWorkflow);
    setCurrentView('editor');
  };

  const handleCreateFromTemplate = (template: WorkflowTemplate) => {
    const newWorkflow: Workflow = {
      id: `workflow_${Date.now()}`,
      name: template.name,
      description: template.description,
      active: false,
      nodes: template.workflow.nodes || [],
      connections: template.workflow.connections || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      tags: template.tags,
      settings: template.workflow.settings || {
        timeout: 300000,
        retryCount: 3,
        parallelExecution: false,
        errorHandling: 'stop',
        notifications: []
      }
    };
    setCurrentWorkflow(newWorkflow);
    setShowTemplates(false);
    setCurrentView('editor');
  };

  const handleSaveWorkflow = async (workflow: Workflow) => {
    try {
      await api.saveWorkflow(workflow);
      setCurrentWorkflow(workflow);
      showNotification('Workflow saved successfully!', 'success');
    } catch (error: any) {
      showNotification(`Failed to save workflow: ${error.message}`, 'error');
    }
  };

  const handleBackToDashboard = () => {
    setCurrentWorkflow(null);
    setCurrentView('dashboard');
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    // Simple notification system - in production, use a proper notification library
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in forwards';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            if (currentView === 'dashboard') {
              handleCreateWorkflow();
            }
            break;
          case 't':
            e.preventDefault();
            if (currentView === 'dashboard') {
              setShowTemplates(true);
            }
            break;
          case 'h':
            e.preventDefault();
            if (currentView === 'editor') {
              handleBackToDashboard();
            }
            break;
          case ',':
            e.preventDefault();
            // Open settings modal (to be implemented)
            break;
        }
      }
      
      if (e.key === 'Escape') {
        if (showTemplates) {
          setShowTemplates(false);
        } else if (currentView === 'editor') {
          handleBackToDashboard();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, showTemplates]);

  return (
    <div className="App" data-theme={settings.theme}>
      {/* Global Navigation */}
      {currentView === 'editor' && (
        <div className="global-nav">
          <div className="nav-content">
            <button 
              className="nav-btn back-btn" 
              onClick={handleBackToDashboard}
              title="Back to Dashboard (Ctrl+H)"
            >
              ← Dashboard
            </button>
            
            <div className="nav-title">
              <h1>{currentWorkflow?.name || 'Workflow Editor'}</h1>
              {currentWorkflow?.description && (
                <p className="nav-subtitle">{currentWorkflow.description}</p>
              )}
            </div>
            
            <div className="nav-actions">
              <button
                className="nav-btn theme-btn"
                onClick={() => updateSettings({ 
                  theme: settings.theme === 'light' ? 'dark' : 'light' 
                })}
                title="Toggle Theme"
              >
                {settings.theme === 'light' ? '🌙' : '☀️'}
              </button>
              
              <button
                className="nav-btn settings-btn"
                title="Settings (Ctrl+,)"
              >
                ⚙️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`app-content ${currentView === 'editor' ? 'with-nav' : ''}`}>
        {currentView === 'dashboard' && (
          <WorkflowDashboard
            onOpenWorkflow={handleOpenWorkflow}
            onCreateWorkflow={() => setShowTemplates(true)}
          />
        )}

        {currentView === 'editor' && currentWorkflow && (
          <EnhancedWorkflowEditor
            workflow={currentWorkflow}
            onSave={handleSaveWorkflow}
          />
        )}
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <WorkflowTemplates
          onCreateFromTemplate={handleCreateFromTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Quick Actions Floating Button */}
      {currentView === 'dashboard' && (
        <div className="quick-actions">
          <button
            className="quick-action-btn main"
            onClick={() => setShowTemplates(true)}
            title="Create Workflow (Ctrl+N)"
          >
            +
          </button>
          <div className="quick-action-menu">
            <button
              className="quick-action-btn"
              onClick={handleCreateWorkflow}
              title="Blank Workflow"
            >
              📄
            </button>
            <button
              className="quick-action-btn"
              onClick={() => setShowTemplates(true)}
              title="From Template (Ctrl+T)"
            >
              📋
            </button>
          </div>
        </div>
      )}

      {/* Global Styles for Notifications */}
      <style>{`
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: var(--background-color);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          padding: 16px;
          box-shadow: var(--shadow-hover);
          z-index: 10000;
          max-width: 400px;
          animation: slideIn 0.3s ease-out;
        }

        .notification.success { border-left: 4px solid var(--success-color); }
        .notification.error { border-left: 4px solid var(--danger-color); }
        .notification.warning { border-left: 4px solid var(--warning-color); }
        .notification.info { border-left: 4px solid var(--info-color); }

        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default App;