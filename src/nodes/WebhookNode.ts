import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

export class WebhookNode extends BaseNode {
  nodeType: NodeType = {
    name: 'webhook',
    displayName: 'Webhook',
    description: 'Receive HTTP requests',
    group: 'Trigger',
    inputs: [],
    outputs: ['main'],
    parameters: [
      {
        name: 'path',
        displayName: 'Path',
        type: 'string',
        required: true,
        default: '/webhook'
      },
      {
        name: 'method',
        displayName: 'Method',
        type: 'options',
        required: true,
        default: 'POST',
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
          { name: 'DELETE', value: 'DELETE' }
        ]
      }
    ]
  };

  async execute(
    node: WorkflowNode,
    inputData: Record<string, any>,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    const path = this.getParameter(node, 'path', '/webhook');
    const method = this.getParameter(node, 'method', 'POST');
    
    // Generate webhook URL for this workflow
    const webhookUrl = `http://localhost:3001/webhook/${context.workflowId || 'unknown'}`;
    
    console.log(`[Webhook Node] Webhook available at: ${method} ${webhookUrl}`);
    
    // For webhook nodes, the input data comes from the HTTP request
    return {
      webhookUrl,
      method,
      path,
      body: inputData.body || inputData,
      headers: inputData.headers || {},
      query: inputData.query || {},
      params: inputData.params || {},
      timestamp: new Date().toISOString()
    };
  }
}