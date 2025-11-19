import React, { useState, useEffect, useRef } from 'react';
import { WorkflowNode, WorkflowConnection, Workflow, NodeType } from '../types';
import { api } from '../services/api';
import './WorkflowEditor.css';

interface ExecutionUpdate {
  type: string;
  executionId?: string;
  nodeId?: string;
  nodeName?: string;
  execution?: any;
}

interface WorkflowEditorProps {
  workflow: Workflow;
  onSave: (workflow: Workflow) => void;
}

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ workflow, onSave }) => {
  const [nodes, setNodes] = useState<WorkflowNode[]>(workflow.nodes);
  const [connections, setConnections] = useState<WorkflowConnection[]>(workflow.connections);
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [draggedNodeType, setDraggedNodeType] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<string>('');
  const [executingNodes, setExecutingNodes] = useState<Set<string>>(new Set());
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    loadNodeTypes();
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    try {
      const wsUrl = process.env.NODE_ENV === 'development' 
        ? 'ws://localhost:3001'
        : `ws://${window.location.host}`;
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        addLog('Connected to workflow engine');
      };
      
      wsRef.current.onmessage = (event) => {
        const update: ExecutionUpdate = JSON.parse(event.data);
        handleExecutionUpdate(update);
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        addLog('Disconnected from workflow engine');
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        addLog('WebSocket connection error');
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  };

  const handleExecutionUpdate = (update: ExecutionUpdate) => {
    switch (update.type) {
      case 'execution_started':
        setExecutionStatus('Running...');
        setExecutingNodes(new Set());
        addLog(`Execution started: ${update.execution?.id}`);
        break;
      case 'node_started':
        if (update.nodeId) {
          setExecutingNodes(prev => {
            const newSet = new Set(prev);
            newSet.add(update.nodeId!);
            return newSet;
          });
          addLog(`Executing: ${update.nodeName}`);
        }
        break;
      case 'node_completed':
        if (update.nodeId) {
          setExecutingNodes(prev => {
            const newSet = new Set(prev);
            newSet.delete(update.nodeId!);
            return newSet;
          });
          addLog(`Completed: ${update.nodeName}`);
        }
        break;
      case 'execution_completed':
        setExecutionStatus('Completed');
        setExecutingNodes(new Set());
        addLog('Execution completed successfully');
        break;
      case 'execution_failed':
        setExecutionStatus('Failed');
        setExecutingNodes(new Set());
        addLog(`Execution failed: ${update.execution?.error}`);
        break;
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLogs(prev => [...prev.slice(-19), `[${timestamp}] ${message}`]);
  };

  const loadNodeTypes = async () => {
    try {
      const types = await api.getNodeTypes();
      setNodeTypes(types);
    } catch (error) {
      console.error('Failed to load node types:', error);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    console.log('Drop event:', draggedNodeType);
    if (!draggedNodeType) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const nodeType = nodeTypes.find(t => t.name === draggedNodeType);
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type: draggedNodeType,
      name: nodeType?.displayName || draggedNodeType,
      position: { x, y },
      parameters: {}
    };

    console.log('Adding node:', newNode);
    setNodes(prev => [...prev, newNode]);
    setDraggedNodeType(null);
  };

  const handleDragStart = (nodeTypeName: string) => {
    console.log('Drag start:', nodeTypeName);
    setDraggedNodeType(nodeTypeName);
  };

  const handleDragEnd = () => {
    setDraggedNodeType(null);
  };

  const handleNodeClick = (node: WorkflowNode, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isConnecting && connectionStart && connectionStart !== node.id) {
      // Create connection
      const newConnection: WorkflowConnection = {
        id: `conn_${Date.now()}`,
        sourceNodeId: connectionStart,
        targetNodeId: node.id
      };
      setConnections([...connections, newConnection]);
      setIsConnecting(false);
      setConnectionStart(null);
    } else {
      setSelectedNode(node);
    }
  };

  const startConnection = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConnecting(true);
    setConnectionStart(nodeId);
  };

  const deleteNode = (nodeId: string) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    setConnections(connections.filter(c => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  const updateNodeParameter = (paramName: string, value: any) => {
    if (!selectedNode) return;

    const updatedNodes = nodes.map(node =>
      node.id === selectedNode.id
        ? { ...node, parameters: { ...node.parameters, [paramName]: value } }
        : node
    );

    setNodes(updatedNodes);
    setSelectedNode({ ...selectedNode, parameters: { ...selectedNode.parameters, [paramName]: value } });
  };

  const saveWorkflow = () => {
    const updatedWorkflow: Workflow = {
      ...workflow,
      nodes,
      connections,
      updatedAt: new Date()
    };
    onSave(updatedWorkflow);
  };

  const executeWorkflow = async () => {
    try {
      setExecutionStatus('Starting...');
      setExecutionLogs([]);
      addLog('Starting workflow execution...');
      
      const result = await api.executeWorkflow(workflow.id);
      
      if (result.status === 'success') {
        addLog('Workflow execution completed successfully');
      } else {
        addLog(`Workflow execution failed: ${result.error}`);
      }
    } catch (error: any) {
      setExecutionStatus('Error');
      addLog(`Execution error: ${error.message}`);
    }
  };

  const createTestWorkflow = () => {
    const startNode: WorkflowNode = {
      id: 'start_1',
      type: 'start',
      name: 'Start',
      position: { x: 50, y: 100 },
      parameters: { triggerData: '{"message": "Hello World"}' }
    };
    
    const setNode: WorkflowNode = {
      id: 'set_1',
      type: 'set',
      name: 'Set Data',
      position: { x: 250, y: 100 },
      parameters: { values: '{"processed": true, "timestamp": "' + new Date().toISOString() + '"}' }
    };
    
    const connection: WorkflowConnection = {
      id: 'conn_1',
      sourceNodeId: 'start_1',
      targetNodeId: 'set_1'
    };
    
    setNodes([startNode, setNode]);
    setConnections([connection]);
  };

  return (
    <div className="workflow-editor">
      <div className="toolbar">
        <button onClick={saveWorkflow}>Save</button>
        <button onClick={executeWorkflow} disabled={executionStatus === 'Running...'}>Execute</button>
        <button onClick={createTestWorkflow} className="test-btn">Create Test Workflow</button>
        <div className="execution-status">
          Status: <span className={`status ${executionStatus.toLowerCase().replace('...', '')}`}>{executionStatus || 'Ready'}</span>
        </div>
      </div>

      <div className="editor-content">
        <div className="node-palette">
          <h3>Nodes</h3>
          {nodeTypes.map(nodeType => (
            <div
              key={nodeType.name}
              className="node-type-item"
              draggable
              onDragStart={() => handleDragStart(nodeType.name)}
              onDragEnd={handleDragEnd}
            >
              {nodeType.displayName}
            </div>
          ))}
        </div>

        <div
          className="canvas"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => {
            setIsConnecting(false);
            setConnectionStart(null);
          }}
        >
          {/* Render connections */}
          <svg className="connections-svg">
            {connections.map(conn => {
              const sourceNode = nodes.find(n => n.id === conn.sourceNodeId);
              const targetNode = nodes.find(n => n.id === conn.targetNodeId);
              if (!sourceNode || !targetNode) return null;
              
              return (
                <line
                  key={conn.id}
                  x1={sourceNode.position.x + 60}
                  y1={sourceNode.position.y + 30}
                  x2={targetNode.position.x + 60}
                  y2={targetNode.position.y + 30}
                  stroke="#007bff"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                      refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#007bff" />
              </marker>
            </defs>
          </svg>
          
          {/* Render nodes */}
          {nodes.map(node => (
            <div
              key={node.id}
              className={`workflow-node ${selectedNode?.id === node.id ? 'selected' : ''} ${isConnecting && connectionStart === node.id ? 'connecting' : ''} ${executingNodes.has(node.id) ? 'executing' : ''}`}
              style={{
                left: node.position.x,
                top: node.position.y
              }}
              onClick={(e) => handleNodeClick(node, e)}
            >
              <div className="node-header">
                {node.name}
                <button 
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNode(node.id);
                  }}
                >
                  ×
                </button>
              </div>
              <div className="node-type-display">{node.type}</div>
              <div className="node-controls">
                <button 
                  className="connect-btn"
                  onClick={(e) => startConnection(node.id, e)}
                  title="Connect to another node"
                >
                  →
                </button>
              </div>
            </div>
          ))}
          
          {isConnecting && (
            <div className="connection-hint">
              Click on another node to create a connection
            </div>
          )}
        </div>

        <div className="properties-panel">
          {selectedNode ? (
            <>
              <h3>Properties</h3>
              <div className="property">
                <label>Name:</label>
                <input
                  value={selectedNode.name}
                  onChange={(e) => {
                    const updatedNodes = nodes.map(node =>
                      node.id === selectedNode.id ? { ...node, name: e.target.value } : node
                    );
                    setNodes(updatedNodes);
                    setSelectedNode({ ...selectedNode, name: e.target.value });
                  }}
                />
              </div>

              {nodeTypes
                .find(t => t.name === selectedNode.type)
                ?.parameters.map(param => (
                  <div key={param.name} className="property">
                    <label>{param.displayName}:</label>
                    {param.type === 'options' ? (
                      <select
                        value={selectedNode.parameters[param.name] || param.default}
                        onChange={(e) => updateNodeParameter(param.name, e.target.value)}
                      >
                        {param.options?.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    ) : param.type === 'boolean' ? (
                      <input
                        type="checkbox"
                        checked={selectedNode.parameters[param.name] || param.default || false}
                        onChange={(e) => updateNodeParameter(param.name, e.target.checked)}
                      />
                    ) : (
                      <textarea
                        rows={param.name.includes('code') || param.name.includes('body') || param.name.includes('query') ? 4 : 1}
                        value={selectedNode.parameters[param.name] || param.default || ''}
                        onChange={(e) => updateNodeParameter(param.name, e.target.value)}
                        placeholder={param.default}
                      />
                    )}
                  </div>
                ))}
            </>
          ) : (
            <div className="execution-logs">
              <h3>Execution Logs</h3>
              <div className="logs-container">
                {executionLogs.map((log, index) => (
                  <div key={index} className="log-entry">{log}</div>
                ))}
                {executionLogs.length === 0 && (
                  <div className="no-logs">No execution logs yet</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};