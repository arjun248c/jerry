import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer } from 'ws';
import { Workflow, WorkflowNode, ExecutionData } from '../types';
import { nodeRegistry } from '../nodes';
import { Database } from '../database/database';

export class WorkflowEngine {
  private db: Database;
  private wss?: WebSocketServer;

  constructor(db: Database, wss?: WebSocketServer) {
    this.db = db;
    this.wss = wss;
  }

  private broadcast(message: any) {
    if (this.wss) {
      this.wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify(message));
        }
      });
    }
  }

  async executeWorkflow(workflow: Workflow, triggerData: Record<string, any> = {}): Promise<ExecutionData> {
    const execution: ExecutionData = {
      id: uuidv4(),
      workflowId: workflow.id,
      status: 'running',
      startedAt: new Date(),
      data: {}
    };

    try {
      await this.db.saveExecution(execution);
      
      // Broadcast execution start
      this.broadcast({
        type: 'execution_started',
        execution: { ...execution, data: {} }
      });

      // Find start node
      const startNode = workflow.nodes.find(node => node.type === 'start');
      if (!startNode) {
        throw new Error('No start node found in workflow');
      }

      // Execute workflow starting from start node
      const result = await this.executeNode(startNode, triggerData, workflow, new Set(), [], execution.id);
      
      execution.status = 'success';
      execution.finishedAt = new Date();
      execution.data = result;

      // Broadcast execution success
      this.broadcast({
        type: 'execution_completed',
        execution
      });

    } catch (error: any) {
      execution.status = 'error';
      execution.finishedAt = new Date();
      execution.error = error.message;
      
      // Broadcast execution error
      this.broadcast({
        type: 'execution_failed',
        execution
      });
    }

    await this.db.saveExecution(execution);
    return execution;
  }

  private async executeNode(
    node: WorkflowNode,
    inputData: Record<string, any>,
    workflow: Workflow,
    executedNodes: Set<string> = new Set(),
    executionPath: string[] = [],
    executionId?: string
  ): Promise<Record<string, any>> {
    if (executedNodes.has(node.id)) {
      return inputData;
    }

    executedNodes.add(node.id);
    executionPath.push(node.name);

    console.log(`Executing node: ${node.name} (${node.type})`);
    
    // Broadcast node execution start
    if (executionId) {
      this.broadcast({
        type: 'node_started',
        executionId,
        nodeId: node.id,
        nodeName: node.name
      });
    }

    const nodeImplementation = nodeRegistry[node.type];
    if (!nodeImplementation) {
      throw new Error(`Unknown node type: ${node.type}`);
    }

    // Execute current node
    const result = await nodeImplementation.execute(node, inputData, { executionPath, executionId });
    
    // Broadcast node execution completion
    if (executionId) {
      this.broadcast({
        type: 'node_completed',
        executionId,
        nodeId: node.id,
        nodeName: node.name,
        result
      });
    }

    // Handle conditional nodes (IF node)
    if (node.type === 'if') {
      const conditionResult = result._conditionResult;
      const connections = workflow.connections.filter(conn => 
        conn.sourceNodeId === node.id && 
        (conn.sourceOutput === (conditionResult ? 'true' : 'false') || !conn.sourceOutput)
      );
      
      for (const connection of connections) {
        const nextNode = workflow.nodes.find(n => n.id === connection.targetNodeId);
        if (nextNode) {
          await this.executeNode(nextNode, result, workflow, executedNodes, [...executionPath], executionId);
        }
      }
    } else {
      // Regular node execution
      const connections = workflow.connections.filter(conn => conn.sourceNodeId === node.id);
      
      for (const connection of connections) {
        const nextNode = workflow.nodes.find(n => n.id === connection.targetNodeId);
        if (nextNode) {
          await this.executeNode(nextNode, result, workflow, executedNodes, [...executionPath], executionId);
        }
      }
    }

    return result;
  }
}