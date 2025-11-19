import axios from 'axios';
import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

export class HttpRequestNode extends BaseNode {
  nodeType: NodeType = {
    name: 'httpRequest',
    displayName: 'HTTP Request',
    description: 'Make HTTP requests to any URL',
    group: 'Regular',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      {
        name: 'method',
        displayName: 'Method',
        type: 'options',
        required: true,
        default: 'GET',
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
          { name: 'DELETE', value: 'DELETE' }
        ]
      },
      {
        name: 'url',
        displayName: 'URL',
        type: 'string',
        required: true,
        default: ''
      },
      {
        name: 'body',
        displayName: 'Body',
        type: 'string',
        required: false,
        default: ''
      }
    ]
  };

  async execute(
    node: WorkflowNode,
    inputData: Record<string, any>
  ): Promise<Record<string, any>> {
    const method = this.getParameter(node, 'method', 'GET');
    const url = this.getParameter(node, 'url');
    const body = this.getParameter(node, 'body');

    if (!url) {
      throw new Error('URL is required for HTTP Request node');
    }

    try {
      const response = await axios({
        method: method.toLowerCase(),
        url,
        data: body ? JSON.parse(body) : undefined,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return {
        statusCode: response.status,
        headers: response.headers,
        body: response.data
      };
    } catch (error: any) {
      throw new Error(`HTTP Request failed: ${error.message}`);
    }
  }
}