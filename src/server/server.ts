import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database/database';
import { WorkflowEngine } from './WorkflowEngine';
import { nodeRegistry } from '../nodes';
import { Workflow } from '../types';

const app = express();
const port = 3001;
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const db = new Database();
const engine = new WorkflowEngine(db, wss);

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get all workflows
app.get('/api/workflows', async (req, res) => {
  try {
    const workflows = await db.getWorkflows();
    res.json(workflows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Save workflow
app.post('/api/workflows', async (req, res) => {
  try {
    const workflow: Workflow = {
      id: req.body.id || uuidv4(),
      name: req.body.name,
      active: req.body.active || false,
      nodes: req.body.nodes || [],
      connections: req.body.connections || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.saveWorkflow(workflow);
    res.json(workflow);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Execute workflow
app.post('/api/workflows/:id/execute', async (req, res) => {
  try {
    const workflows = await db.getWorkflows();
    const workflow = workflows.find(w => w.id === req.params.id);
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const execution = await engine.executeWorkflow(workflow, req.body.triggerData || {});
    res.json(execution);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get available node types
app.get('/api/node-types', (req, res) => {
  const nodeTypes = Object.values(nodeRegistry).map(node => node.nodeType);
  res.json(nodeTypes);
});

// Get workflow executions
app.get('/api/workflows/:id/executions', async (req, res) => {
  try {
    const executions = await db.getExecutions(req.params.id);
    res.json(executions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all executions
app.get('/api/executions', async (req, res) => {
  try {
    const executions = await db.getExecutions();
    res.json(executions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete workflow
app.delete('/api/workflows/:id', async (req, res) => {
  try {
    await db.deleteWorkflow(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint for external triggers
app.post('/webhook/:workflowId', async (req, res) => {
  try {
    const workflows = await db.getWorkflows();
    const workflow = workflows.find(w => w.id === req.params.workflowId && w.active);
    
    if (!workflow) {
      return res.status(404).json({ error: 'Active workflow not found' });
    }

    const execution = await engine.executeWorkflow(workflow, req.body);
    res.json(execution);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

server.listen(port, () => {
  console.log(`🚀 Workflow Server running on http://localhost:${port}`);
  console.log(`📊 API Health: http://localhost:${port}/api/health`);
  console.log(`🎯 Frontend should be on http://localhost:3000`);
  console.log(`🔌 WebSocket server ready for real-time updates`);
});