import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

export class WebhookNode extends BaseNode {
  nodeType: NodeType = {
    name: 'webhook',
    displayName: 'Webhook',
    description: 'Trigger workflow via incoming HTTP requests (GET or POST)',
    group: 'Trigger',
    inputs: [],
    outputs: ['main'],
    icon: '🪝',
    color: '#00897b',
    parameters: [
      {
        name: 'path',
        displayName: 'Webhook Path',
        type: 'string',
        required: true,
        default: '/my-webhook',
        placeholder: '/my-webhook',
        description: 'URL path to listen on. Full URL will be shown at runtime.'
      },
      {
        name: 'method',
        displayName: 'HTTP Method',
        type: 'options',
        required: true,
        default: 'POST',
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
          { name: 'DELETE', value: 'DELETE' },
          { name: 'Any', value: 'ANY' }
        ]
      },
      {
        name: 'authType',
        displayName: 'Authentication',
        type: 'options',
        required: false,
        default: 'none',
        options: [
          { name: 'None', value: 'none' },
          { name: 'Bearer Token', value: 'bearer' },
          { name: 'Secret Header', value: 'header' }
        ]
      },
      {
        name: 'authSecret',
        displayName: 'Auth Secret / Token',
        type: 'string',
        required: false,
        default: '',
        placeholder: 'your-secret-token',
        description: 'Expected Bearer token value or X-Webhook-Secret header value'
      },
      {
        name: 'responseMode',
        displayName: 'Response Mode',
        type: 'options',
        required: false,
        default: 'immediate',
        options: [
          { name: 'Respond Immediately (202 Accepted)', value: 'immediate' },
          { name: 'Respond After Workflow Completes', value: 'wait' }
        ],
        description: 'When to send HTTP response back to the caller'
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
    const authType = this.getParameter(node, 'authType', 'none');
    const authSecret = this.getParameter(node, 'authSecret', '');
    const responseMode = this.getParameter(node, 'responseMode', 'immediate');

    // Derive actual listening URL
    const workflowId = context.workflowId || 'unknown';
    const baseUrl = process.env.SERVER_URL || 'http://localhost:3001';
    const webhookUrl = `${baseUrl}/webhook/${workflowId}${path.startsWith('/') ? path : '/' + path}`;

    // Validate incoming auth if configured (context contains request info when triggered by HTTP)
    if (authType !== 'none' && authSecret && context.request) {
      const req = context.request;

      if (authType === 'bearer') {
        const authHeader = req.headers?.['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        if (token !== authSecret) {
          throw new Error('Webhook authentication failed: invalid Bearer token');
        }
      } else if (authType === 'header') {
        const secretHeader = req.headers?.['x-webhook-secret'] || '';
        if (secretHeader !== authSecret) {
          throw new Error('Webhook authentication failed: invalid X-Webhook-Secret header');
        }
      }
    }

    console.log(`[Webhook Node] ${method} ${webhookUrl} | Auth: ${authType} | Mode: ${responseMode}`);

    // Build output — merge request data with existing inputData
    const requestBody = inputData.body ?? inputData;
    const requestHeaders = inputData.headers ?? {};
    const requestQuery = inputData.query ?? {};
    const requestParams = inputData.params ?? {};

    return {
      webhookUrl,
      method,
      path,
      responseMode,
      body: requestBody,
      headers: requestHeaders,
      query: requestQuery,
      params: requestParams,
      timestamp: new Date().toISOString()
    };
  }
}