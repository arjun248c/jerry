import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WorkflowNode, WorkflowConnection, Workflow, NodeType, AppSettings } from '../types';
import { api, FALLBACK_NODE_TYPES } from '../services/api';
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

interface CanvasState {
  zoom: number;
  pan: { x: number; y: number };
  isDragging: boolean;
  dragStart: { x: number; y: number };
}

export const EnhancedWorkflowEditor: React.FC<WorkflowEditorProps> = ({ workflow, onSave }) => {
  // Core state
  const [nodes, setNodes] = useState<WorkflowNode[]>(workflow.nodes);
  const [connections, setConnections] = useState<WorkflowConnection[]>(workflow.connections);
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  
  // UI state
  const [draggedNodeType, setDraggedNodeType] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMinimap] = useState(true);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(false);
  
  // Canvas state
  const [canvasState, setCanvasState] = useState<CanvasState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
    isDragging: false,
    dragStart: { x: 0, y: 0 }
  });
  
  // Execution state
  const [executionStatus, setExecutionStatus] = useState<string>('');
  const [executingNodes, setExecutingNodes] = useState<Set<string>>(new Set());
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [nodeExecutionData, setNodeExecutionData] = useState<Map<string, any>>(new Map());
  
  // Settings
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'light',
    language: 'en',
    autoSave: true,
    gridSnap: true,
    showMinimap: true,
    debugMode: false
  });
  
  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | undefined>(undefined);
  // Node dragging refs (avoid state re-renders during drag for perf)
  const draggingNodeId = useRef<string | null>(null);
  const draggingNodeOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasStateRef = useRef(canvasState);
  const spacePressedRef = useRef(false);
  // Keep canvasStateRef in sync
  useEffect(() => { canvasStateRef.current = canvasState; }, [canvasState]);
  
  // Load initial data
  useEffect(() => {
    loadNodeTypes();
    connectWebSocket();
    loadSettings();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Auto-save functionality
  useEffect(() => {
    if (settings.autoSave) {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
      autoSaveRef.current = setTimeout(() => {
        saveWorkflow();
      }, 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, connections, settings.autoSave]);
  
  // Theme handling
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);
  
  const loadSettings = () => {
    const savedSettings = localStorage.getItem('workflow-editor-settings');
    if (savedSettings) {
      setSettings({ ...settings, ...JSON.parse(savedSettings) });
    }
  };
  
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('workflow-editor-settings', JSON.stringify(updated));
  };
  
  const connectWebSocket = () => {
    // Only attempt WebSocket in development — no backend in production
    if (process.env.NODE_ENV !== 'development') {
      addLog('Running in local mode (no backend)', 'info');
      return;
    }
    try {
      const wsUrl = 'ws://localhost:3001';
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        addLog('Connected to workflow engine', 'info');
      };
      
      wsRef.current.onmessage = (event) => {
        const update: ExecutionUpdate = JSON.parse(event.data);
        handleExecutionUpdate(update);
      };
      
      wsRef.current.onclose = () => {
        addLog('Disconnected from workflow engine', 'warning');
      };
      
      wsRef.current.onerror = () => {
        addLog('WebSocket connection error', 'error');
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  };
  
  const handleExecutionUpdate = (update: ExecutionUpdate) => {
    switch (update.type) {
      case 'execution_started':
        setExecutionStatus('Running');
        setExecutingNodes(new Set());
        addLog(`Execution started: ${update.execution?.id}`, 'info');
        break;
      case 'node_started':
        if (update.nodeId) {
          setExecutingNodes(prev => new Set([...prev, update.nodeId!]));
          addLog(`Executing: ${update.nodeName}`, 'info');
        }
        break;
      case 'node_completed':
        if (update.nodeId) {
          setExecutingNodes(prev => {
            const newSet = new Set(prev);
            newSet.delete(update.nodeId!);
            return newSet;
          });
          addLog(`Completed: ${update.nodeName}`, 'success');
          
          // Store execution data for preview
          if (update.execution?.data) {
            setNodeExecutionData(prev => new Map(prev.set(update.nodeId!, update.execution.data)));
          }
        }
        break;
      case 'execution_completed':
        setExecutionStatus('Completed');
        setExecutingNodes(new Set());
        addLog('Execution completed successfully', 'success');
        showNotification('Workflow executed successfully', 'success');
        break;
      case 'execution_failed':
        setExecutionStatus('Failed');
        setExecutingNodes(new Set());
        addLog(`Execution failed: ${update.execution?.error}`, 'error');
        showNotification('Workflow execution failed', 'error');
        break;
    }
  };
  
  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setExecutionLogs(prev => [...prev.slice(-49), logEntry]);
  };
  
  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    // Simple notification - in production, use a proper notification library
    console.log(`${type.toUpperCase()}: ${message}`);
  };
  
  const loadNodeTypes = async () => {
    // Always start with fallback so nodes are immediately visible
    setNodeTypes(FALLBACK_NODE_TYPES);
    try {
      const types = await api.getNodeTypes();
      if (types && types.length > 0) {
        setNodeTypes(types);
      }
    } catch (error) {
      console.warn('Using built-in node types (server unavailable)');
      addLog('Using built-in node types (server offline)', 'warning');
    }
  };
  
  // ── Canvas pan: space+drag or middle-click drag ──────────────────────────
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Middle mouse OR Space held + left click → start panning
    if (e.button === 1 || (e.button === 0 && spacePressedRef.current)) {
      e.preventDefault();
      setCanvasState(prev => ({
        ...prev,
        isDragging: true,
        dragStart: { x: e.clientX - prev.pan.x, y: e.clientY - prev.pan.y }
      }));
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (canvasState.isDragging) {
      setCanvasState(prev => ({
        ...prev,
        pan: {
          x: e.clientX - prev.dragStart.x,
          y: e.clientY - prev.dragStart.y
        }
      }));
    }
  };

  const handleCanvasMouseUp = () => {
    setCanvasState(prev => ({ ...prev, isDragging: false }));
  };

  // ── Mouse wheel zoom (zoom toward cursor) ────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const ZOOM_SPEED = 0.001;
      const delta = -e.deltaY * ZOOM_SPEED;
      setCanvasState(prev => {
        const newZoom = Math.max(0.1, Math.min(3, prev.zoom + delta * prev.zoom));
        // Zoom toward mouse cursor position
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const zoomFactor = newZoom / prev.zoom;
        const newPanX = mouseX - (mouseX - prev.pan.x) * zoomFactor;
        const newPanY = mouseY - (mouseY - prev.pan.y) * zoomFactor;
        return { ...prev, zoom: newZoom, pan: { x: newPanX, y: newPanY } };
      });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  // ── Space key tracking for pan mode ──────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const target = e.target as HTMLElement;
        const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
        if (!isEditable) {
          e.preventDefault();
          spacePressedRef.current = true;
          if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spacePressedRef.current = false;
        if (canvasRef.current) canvasRef.current.style.cursor = '';
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, []);

  // ── Node dragging (mouse-based, so nodes can be re-positioned) ───────────
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    // Only left-click, not on buttons, not when connecting, not when space held
    if (e.button !== 0 || isConnecting || spacePressedRef.current) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) return;

    e.stopPropagation();
    e.preventDefault();

    const cs = canvasStateRef.current;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Offset between mouse position (in canvas coords) and node top-left
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseCanvasX = (e.clientX - rect.left - cs.pan.x) / cs.zoom;
    const mouseCanvasY = (e.clientY - rect.top - cs.pan.y) / cs.zoom;
    draggingNodeOffset.current = {
      x: mouseCanvasX - node.position.x,
      y: mouseCanvasY - node.position.y
    };
    draggingNodeId.current = nodeId;

    // Select the node on mousedown
    setSelectedNode(node);
    setSelectedNodes(new Set([nodeId]));
  };

  // Global mousemove / mouseup for node dragging
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingNodeId.current || !canvasRef.current) return;
      const cs = canvasStateRef.current;
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseCanvasX = (e.clientX - rect.left - cs.pan.x) / cs.zoom;
      const mouseCanvasY = (e.clientY - rect.top - cs.pan.y) / cs.zoom;
      let newX = mouseCanvasX - draggingNodeOffset.current.x;
      let newY = mouseCanvasY - draggingNodeOffset.current.y;

      // Grid snap
      if (cs.zoom >= 0.4) { // only snap when not too zoomed out
        newX = Math.round(newX / 20) * 20;
        newY = Math.round(newY / 20) * 20;
      }

      const id = draggingNodeId.current;
      setNodes(prev => prev.map(n =>
        n.id === id ? { ...n, position: { x: newX, y: newY } } : n
      ));
    };

    const onMouseUp = () => {
      draggingNodeId.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const handleZoom = (delta: number) => {
    setCanvasState(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(3, prev.zoom + delta))
    }));
  };

  const resetView = () => {
    setCanvasState({
      zoom: 1,
      pan: { x: 0, y: 0 },
      isDragging: false,
      dragStart: { x: 0, y: 0 }
    });
  };
  
  // Node operations
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedNodeType) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - canvasState.pan.x) / canvasState.zoom;
    const y = (e.clientY - rect.top - canvasState.pan.y) / canvasState.zoom;

    const nodeType = nodeTypes.find(t => t.name === draggedNodeType);
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type: draggedNodeType,
      name: nodeType?.displayName || draggedNodeType,
      position: { 
        x: settings.gridSnap ? Math.round(x / 20) * 20 : x, 
        y: settings.gridSnap ? Math.round(y / 20) * 20 : y 
      },
      parameters: {}
    };

    setNodes(prev => [...prev, newNode]);
    setDraggedNodeType(null);
    addLog(`Added ${nodeType?.displayName} node`, 'info');
  };
  
  const duplicateNode = (node: WorkflowNode) => {
    const newNode: WorkflowNode = {
      ...node,
      id: `node_${Date.now()}`,
      name: `${node.name} (Copy)`,
      position: { x: node.position.x + 20, y: node.position.y + 20 }
    };
    setNodes(prev => [...prev, newNode]);
    addLog(`Duplicated ${node.name}`, 'info');
  };
  
  const deleteSelectedNodes = () => {
    if (selectedNodes.size === 0 && !selectedNode) return;
    
    const nodesToDelete = selectedNodes.size > 0 ? selectedNodes : new Set([selectedNode!.id]);
    
    setNodes(prev => prev.filter(n => !nodesToDelete.has(n.id)));
    setConnections(prev => prev.filter(c => 
      !nodesToDelete.has(c.sourceNodeId) && !nodesToDelete.has(c.targetNodeId)
    ));
    
    setSelectedNodes(new Set());
    setSelectedNode(null);
    addLog(`Deleted ${nodesToDelete.size} node(s)`, 'info');
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ── Guard: ignore all shortcuts when the user is typing in a form field ──
      const target = e.target as HTMLElement;
      const isEditableTarget =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (e.ctrlKey || e.metaKey) {
        // Only Ctrl+S makes sense even when an input is focused; everything else
        // (e.g. Ctrl+A to select all nodes) should be blocked to avoid conflicts.
        if (isEditableTarget && e.key !== 's') return;

        switch (e.key) {
          case 's':
            e.preventDefault();
            saveWorkflow();
            break;
          case 'z':
            e.preventDefault();
            // Implement undo
            break;
          case 'y':
            e.preventDefault();
            // Implement redo
            break;
          case 'd':
            e.preventDefault();
            if (selectedNode) duplicateNode(selectedNode);
            break;
          case 'a':
            e.preventDefault();
            setSelectedNodes(new Set(nodes.map(n => n.id)));
            break;
        }
      } else {
        // All non-Ctrl shortcuts (Delete, Backspace, Escape) must be blocked
        // when focus is inside an editable element.
        if (isEditableTarget) return;

        switch (e.key) {
          case 'Delete':
          case 'Backspace':
            deleteSelectedNodes();
            break;
          case 'Escape':
            setSelectedNodes(new Set());
            setSelectedNode(null);
            setIsConnecting(false);
            setConnectionStart(null);
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode, selectedNodes, nodes]);
  
  const saveWorkflow = useCallback(() => {
    const updatedWorkflow: Workflow = {
      ...workflow,
      nodes,
      connections,
      updatedAt: new Date(),
      version: (workflow.version || 0) + 1
    };
    onSave(updatedWorkflow);
    addLog('Workflow saved', 'success');
  }, [workflow, nodes, connections, onSave]);
  
  // ── Execution via Backend API ─────────────────────────────────────────────
  const executeWorkflow = async () => {
    if (nodes.length === 0) {
      addLog('No nodes to execute. Add some nodes first.', 'warning');
      return;
    }

    if (!workflow.id || workflow.id.startsWith('node_') || workflow.id.startsWith('new_')) {
      addLog('Please save the workflow first before executing.', 'warning');
      saveWorkflow();
      return;
    }

    setExecutionStatus('Running');
    setExecutionLogs([]);
    setNodeExecutionData(new Map());
    addLog('🚀 Triggering workflow execution on server...', 'info');

    try {
      // Save current state first to ensure backend runs the latest changes
      const updatedWorkflow: Workflow = {
        ...workflow,
        nodes,
        connections,
        updatedAt: new Date(),
        version: (workflow.version || 0) + 1
      };
      await api.saveWorkflow(updatedWorkflow);

      // Execute on backend
      await api.executeWorkflow(updatedWorkflow.id);
      addLog('Execution request sent to server.', 'info');
      
      // The WebSocket will handle the rest of the updates
    } catch (error: any) {
      setExecutionStatus('Error');
      addLog(`Execution trigger failed: ${error.message}`, 'error');
      showNotification('Workflow execution failed to start', 'error');
    }
  };
  
  // Filter nodes based on search
  const filteredNodeTypes = nodeTypes.filter(nodeType =>
    nodeType.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    nodeType.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Group nodes by category
  const groupedNodeTypes = filteredNodeTypes.reduce((groups, nodeType) => {
    const group = nodeType.group || 'Other';
    if (!groups[group]) groups[group] = [];
    groups[group].push(nodeType);
    return groups;
  }, {} as Record<string, NodeType[]>);
  
  return (
    <div className="workflow-editor">
      {/* Enhanced Toolbar */}
      <div className="toolbar">
        <div className="toolbar-section">
          <button onClick={saveWorkflow} title="Save (Ctrl+S)">
            💾 Save
          </button>
          <button 
            onClick={executeWorkflow} 
            disabled={executionStatus === 'Running'}
            className="btn-success"
            title="Execute workflow"
          >
            ▶️ Execute
          </button>
        </div>
        
        <div className="toolbar-divider" />
        
        <div className="toolbar-section">
          <button 
            onClick={() => setPaletteCollapsed(!paletteCollapsed)}
            className="btn-secondary"
            title="Toggle node palette"
          >
            📋
          </button>
          <button 
            onClick={() => setPropertiesCollapsed(!propertiesCollapsed)}
            className="btn-secondary"
            title="Toggle properties panel"
          >
            ⚙️
          </button>
        </div>
        
        <div className="toolbar-divider" />
        
        <div className="zoom-controls">
          <button className="zoom-btn" onClick={() => handleZoom(-0.1)} title="Zoom out">-</button>
          <span className="zoom-level">{Math.round(canvasState.zoom * 100)}%</span>
          <button className="zoom-btn" onClick={() => handleZoom(0.1)} title="Zoom in">+</button>
          <button className="zoom-btn" onClick={resetView} title="Reset view">⌂</button>
        </div>
        
        <div className="toolbar-divider" />
        
        <button 
          className="theme-toggle"
          onClick={() => updateSettings({ 
            theme: settings.theme === 'light' ? 'dark' : 'light' 
          })}
          title="Toggle theme"
        >
          {settings.theme === 'light' ? '🌙' : '☀️'}
        </button>
        
        <div className="execution-status">
          <div className={`status-indicator ${executionStatus.toLowerCase()}`}></div>
          Status: <span className={`status ${executionStatus.toLowerCase()}`}>
            {executionStatus || 'Ready'}
          </span>
        </div>
      </div>

      <div className="editor-content">
        {/* Enhanced Node Palette */}
        {!paletteCollapsed && (
          <div className="node-palette">
            <div className="palette-header">
              <h3>Nodes</h3>
              <button 
                className="palette-toggle"
                onClick={() => setPaletteCollapsed(true)}
              >
                ←
              </button>
            </div>
            
            <div className="palette-search">
              <input
                type="text"
                className="search-input"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="palette-content">
              {Object.entries(groupedNodeTypes).map(([group, nodes]) => (
                <div key={group} className="node-group">
                  <div className="group-header">{group}</div>
                  {nodes.map(nodeType => (
                    <div
                      key={nodeType.name}
                      className="node-type-item"
                      draggable
                      onDragStart={() => setDraggedNodeType(nodeType.name)}
                      onDragEnd={() => setDraggedNodeType(null)}
                      style={{ borderLeftColor: nodeType.color }}
                    >
                      <div className="node-icon">{nodeType.icon || '⚡'}</div>
                      <div className="node-info">
                        <div className="node-name">{nodeType.displayName}</div>
                        <div className="node-description">{nodeType.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Canvas */}
        <div
          ref={canvasRef}
          className="canvas"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onClick={() => {
            setIsConnecting(false);
            setConnectionStart(null);
            setSelectedNode(null);
            setSelectedNodes(new Set());
          }}
        >
          <div 
            className="canvas-container"
            style={{
              transform: `translate(${canvasState.pan.x}px, ${canvasState.pan.y}px) scale(${canvasState.zoom})`
            }}
          >
            {/* Enhanced Connection Lines */}
            <svg className="connections-svg">
              {connections.map(conn => {
                const sourceNode = nodes.find(n => n.id === conn.sourceNodeId);
                const targetNode = nodes.find(n => n.id === conn.targetNodeId);
                if (!sourceNode || !targetNode) return null;
                
                const isActive = executingNodes.has(conn.sourceNodeId) || executingNodes.has(conn.targetNodeId);
                
                // Create curved path
                const x1 = sourceNode.position.x + 80;
                const y1 = sourceNode.position.y + 40;
                const x2 = targetNode.position.x + 80;
                const y2 = targetNode.position.y + 40;
                
                const dx = x2 - x1;
                const curve = Math.abs(dx) * 0.3;
                
                const path = `M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`;
                
                return (
                  <path
                    key={conn.id}
                    d={path}
                    className={`connection-line ${isActive ? 'active' : ''}`}
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                        refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="var(--primary-color)" />
                </marker>
              </defs>
            </svg>
            
            {/* Enhanced Workflow Nodes */}
            {nodes.map(node => {
              const nodeType = nodeTypes.find(t => t.name === node.type);
              const isExecuting = executingNodes.has(node.id);
              const isSelected = selectedNodes.has(node.id) || selectedNode?.id === node.id;
              const executionData = nodeExecutionData.get(node.id);
              
              return (
                <div
                  key={node.id}
                  className={`workflow-node ${isSelected ? 'selected' : ''} ${
                    isConnecting && connectionStart === node.id ? 'connecting' : ''
                  } ${isExecuting ? 'executing' : ''} ${node.disabled ? 'disabled' : ''}`}
                  style={{
                    left: node.position.x,
                    top: node.position.y,
                    borderLeftColor: nodeType?.color,
                    cursor: draggingNodeId.current === node.id ? 'grabbing' : 'grab'
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isConnecting && connectionStart && connectionStart !== node.id) {
                      const newConnection: WorkflowConnection = {
                        id: `conn_${Date.now()}`,
                        sourceNodeId: connectionStart,
                        targetNodeId: node.id
                      };
                      setConnections([...connections, newConnection]);
                      setIsConnecting(false);
                      setConnectionStart(null);
                      addLog(`Connected nodes`, 'info');
                    } else {
                      setSelectedNode(node);
                      setSelectedNodes(new Set([node.id]));
                    }
                  }}
                >
                  <div className="node-header">
                    <div className="node-icon-header">{nodeType?.icon || '⚡'}</div>
                    <div className="node-title">{node.name}</div>
                    <div className="node-actions">
                      <button 
                        className="node-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsConnecting(true);
                          setConnectionStart(node.id);
                        }}
                        title="Connect to another node"
                      >
                        🔗
                      </button>
                      <button 
                        className="node-action-btn danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNodes(nodes.filter(n => n.id !== node.id));
                          setConnections(connections.filter(c => 
                            c.sourceNodeId !== node.id && c.targetNodeId !== node.id
                          ));
                        }}
                        title="Delete node"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <div className="node-content">
                    <div className="node-type-display">{node.type}</div>
                    
                    <div className="node-status">
                      <div className={`status-indicator ${
                        isExecuting ? 'running' : executionData ? 'success' : 'ready'
                      }`}></div>
                      <span>{isExecuting ? 'Running' : executionData ? 'Completed' : 'Ready'}</span>
                    </div>
                    
                    {executionData && settings.debugMode && (
                      <div className="execution-preview">
                        <small>Last output: {JSON.stringify(executionData).substring(0, 50)}...</small>
                      </div>
                    )}
                  </div>
                  
                  <div className="node-connections">
                    <div className="connection-point input" title="Input"></div>
                    <div className="connection-point output" title="Output"></div>
                  </div>
                </div>
              );
            })}
            
            {isConnecting && (
              <div className="connection-hint">
                Click on another node to create a connection
              </div>
            )}
          </div>
          
          {/* Minimap */}
          {showMinimap && settings.showMinimap && (
            <div className="minimap">
              <div 
                className="minimap-viewport"
                style={{
                  left: `${-canvasState.pan.x / 10}px`,
                  top: `${-canvasState.pan.y / 10}px`,
                  width: `${200 / canvasState.zoom}px`,
                  height: `${120 / canvasState.zoom}px`
                }}
              />
            </div>
          )}
        </div>

        {/* Enhanced Properties Panel */}
        {!propertiesCollapsed && (
          <div className="properties-panel">
            <div className="panel-header">
              <h3>{selectedNode ? 'Properties' : 'Execution Logs'}</h3>
              <button 
                className="palette-toggle"
                onClick={() => setPropertiesCollapsed(true)}
              >
                →
              </button>
            </div>
            
            <div className="panel-content">
              {selectedNode ? (
                <>
                  <div className="property-group">
                    <div className="property-group-title">General</div>
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
                    
                    <div className="property">
                      <label>
                        <input
                          type="checkbox"
                          checked={!selectedNode.disabled}
                          onChange={(e) => {
                            const updatedNodes = nodes.map(node =>
                              node.id === selectedNode.id ? { ...node, disabled: !e.target.checked } : node
                            );
                            setNodes(updatedNodes);
                            setSelectedNode({ ...selectedNode, disabled: !e.target.checked });
                          }}
                        />
                        Enabled
                      </label>
                    </div>
                  </div>

                  <div className="property-group">
                    <div className="property-group-title">Parameters</div>
                    {(() => {
                      // Get schema-defined param names for this node type
                      const schemaParams = nodeTypes.find(t => t.name === selectedNode.type)?.parameters || [];
                      const schemaParamNames = new Set(schemaParams.map(p => p.name));
                      // Get extra params stored on the node but not in the schema (e.g. from imported templates)
                      const extraParamKeys = Object.keys(selectedNode.parameters).filter(k => !schemaParamNames.has(k));
                      return (
                        <>
                          {/* Schema-defined params with proper labels */}
                          {schemaParams.map(param => (
                            <div key={param.name} className="property">
                              <label>{param.displayName}:</label>
                              {param.description && (
                                <div className="property-description">{param.description}</div>
                              )}
                              {param.type === 'options' ? (
                                <select
                                  value={selectedNode.parameters[param.name] || param.default}
                                  onChange={(e) => {
                                    const updatedNodes = nodes.map(node =>
                                      node.id === selectedNode.id
                                        ? { ...node, parameters: { ...node.parameters, [param.name]: e.target.value } }
                                        : node
                                    );
                                    setNodes(updatedNodes);
                                    setSelectedNode({ ...selectedNode, parameters: { ...selectedNode.parameters, [param.name]: e.target.value } });
                                  }}
                                >
                                  {param.options?.map(option => (
                                    <option key={option.value} value={option.value}>{option.name}</option>
                                  ))}
                                </select>
                              ) : param.type === 'boolean' ? (
                                <input
                                  type="checkbox"
                                  checked={selectedNode.parameters[param.name] || param.default || false}
                                  onChange={(e) => {
                                    const updatedNodes = nodes.map(node =>
                                      node.id === selectedNode.id
                                        ? { ...node, parameters: { ...node.parameters, [param.name]: e.target.checked } }
                                        : node
                                    );
                                    setNodes(updatedNodes);
                                    setSelectedNode({ ...selectedNode, parameters: { ...selectedNode.parameters, [param.name]: e.target.checked } });
                                  }}
                                />
                              ) : (
                                <textarea
                                  rows={param.type === 'code' || param.type === 'json' ? 6 : 2}
                                  value={selectedNode.parameters[param.name] ?? param.default ?? ''}
                                  onChange={(e) => {
                                    const updatedNodes = nodes.map(node =>
                                      node.id === selectedNode.id
                                        ? { ...node, parameters: { ...node.parameters, [param.name]: e.target.value } }
                                        : node
                                    );
                                    setNodes(updatedNodes);
                                    setSelectedNode({ ...selectedNode, parameters: { ...selectedNode.parameters, [param.name]: e.target.value } });
                                  }}
                                  placeholder={param.placeholder || String(param.default || '')}
                                />
                              )}
                            </div>
                          ))}
                          {/* Extra params from imported templates (not in schema) */}
                          {extraParamKeys.length > 0 && (
                            <div className="property-group" style={{ marginTop: 8 }}>
                              <div className="property-group-title" style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                                Imported Values
                              </div>
                              {extraParamKeys.map(key => (
                                <div key={key} className="property">
                                  <label style={{ textTransform: 'none', fontWeight: 500 }}>
                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}:
                                  </label>
                                  <textarea
                                    rows={typeof selectedNode.parameters[key] === 'string' && selectedNode.parameters[key].length > 60 ? 3 : 2}
                                    value={String(selectedNode.parameters[key] ?? '')}
                                    onChange={(e) => {
                                      const updatedNodes = nodes.map(node =>
                                        node.id === selectedNode.id
                                          ? { ...node, parameters: { ...node.parameters, [key]: e.target.value } }
                                          : node
                                      );
                                      setNodes(updatedNodes);
                                      setSelectedNode({ ...selectedNode, parameters: { ...selectedNode.parameters, [key]: e.target.value } });
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </>
              ) : (
                <div className="execution-logs">
                  <div className="logs-header">
                    <h4>Execution Logs</h4>
                    <button 
                      className="btn-secondary"
                      onClick={() => setExecutionLogs([])}
                      title="Clear logs"
                    >
                      🗑️
                    </button>
                  </div>
                  <div className="logs-container">
                    {executionLogs.map((log, index) => (
                      <div key={index} className={`log-entry ${
                        log.includes('ERROR') ? 'error' :
                        log.includes('SUCCESS') || log.includes('Completed') ? 'success' :
                        log.includes('WARNING') ? 'warning' : 'info'
                      }`}>
                        {log}
                      </div>
                    ))}
                    {executionLogs.length === 0 && (
                      <div className="no-logs">No execution logs yet</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};