import React, { useState } from 'react';
import { WorkflowList } from './components/WorkflowList';
import { WorkflowEditor } from './components/WorkflowEditor';
import { Workflow } from './types';
import { api } from './services/api';
import './App.css';

function App() {
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);

  const handleSelectWorkflow = (workflow: Workflow) => {
    setCurrentWorkflow(workflow);
  };

  const handleCreateWorkflow = () => {
    const newWorkflow: Workflow = {
      id: `workflow_${Date.now()}`,
      name: 'New Workflow',
      active: false,
      nodes: [],
      connections: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setCurrentWorkflow(newWorkflow);
  };

  const handleSaveWorkflow = async (workflow: Workflow) => {
    try {
      await api.saveWorkflow(workflow);
      alert('Workflow saved successfully!');
    } catch (error: any) {
      alert(`Failed to save workflow: ${error.message}`);
    }
  };

  const handleBackToList = () => {
    setCurrentWorkflow(null);
  };

  return (
    <div className="App">
      {currentWorkflow ? (
        <div>
          <div className="nav-bar">
            <button onClick={handleBackToList}>← Back to Workflows</button>
            <h1>{currentWorkflow.name}</h1>
          </div>
          <WorkflowEditor
            workflow={currentWorkflow}
            onSave={handleSaveWorkflow}
          />
        </div>
      ) : (
        <WorkflowList
          onSelectWorkflow={handleSelectWorkflow}
          onCreateWorkflow={handleCreateWorkflow}
        />
      )}
    </div>
  );
}

export default App;
