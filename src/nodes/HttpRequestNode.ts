import axios, { AxiosRequestConfig } from 'axios';
import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

export class HttpRequestNode extends BaseNode {
  nodeType: NodeType = {
    name: 'httpRequest',
    displayName: 'HTTP Request',
    description: 'Make HTTP requests to any URL with full header, auth, and body support',
    group: 'Regular',
    inputs: ['main'],
    outputs: ['main'],
    icon: '🌐',
    color: '#0288d1',
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
          { name: 'PATCH', value: 'PATCH' },
          { name: 'DELETE', value: 'DELETE' },
          { name: 'HEAD', value: 'HEAD' },
          { name: 'OPTIONS', value: 'OPTIONS' }
        ]
      },
      {
        name: 'url',
        displayName: 'URL',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'https://api.example.com/endpoint'
      },
      {
        name: 'headers',
        displayName: 'Headers (JSON)',
        type: 'json',
        required: false,
        default: '{}',
        placeholder: '{"Authorization": "Bearer token", "Accept": "application/json"}',
        description: 'Request headers as a JSON object'
      },
      {
        name: 'body',
        displayName: 'Body',
        type: 'json',
        required: false,
        default: '',
        placeholder: '{"key": "value"}',
        description: 'Request body (for POST/PUT/PATCH). Accepts JSON object or raw string.'
      },
      {
        name: 'queryParams',
        displayName: 'Query Parameters (JSON)',
        type: 'json',
        required: false,
        default: '{}',
        placeholder: '{"page": "1", "limit": "10"}',
        description: 'URL query parameters as a JSON object'
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
          { name: 'Basic Auth', value: 'basic' },
          { name: 'API Key (Header)', value: 'apikey' }
        ]
      },
      {
        name: 'authToken',
        displayName: 'Auth Token / API Key',
        type: 'string',
        required: false,
        default: '',
        placeholder: 'your-token-here',
        description: 'Bearer token, API key, or Basic Auth credentials (user:password)'
      },
      {
        name: 'apiKeyHeader',
        displayName: 'API Key Header Name',
        type: 'string',
        required: false,
        default: 'X-API-Key',
        placeholder: 'X-API-Key',
        description: 'Header name for API key authentication'
      },
      {
        name: 'timeout',
        displayName: 'Timeout (ms)',
        type: 'number',
        required: false,
        default: 30000,
        description: 'Request timeout in milliseconds'
      },
      {
        name: 'followRedirects',
        displayName: 'Follow Redirects',
        type: 'boolean',
        required: false,
        default: true
      },
      {
        name: 'ignoreSSLErrors',
        displayName: 'Ignore SSL Errors',
        type: 'boolean',
        required: false,
        default: false,
        description: 'Ignore SSL certificate errors (not recommended for production)'
      }
    ]
  };

  async execute(
    node: WorkflowNode,
    inputData: Record<string, any>,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    const method = this.getParameter(node, 'method', 'GET');
    const url = this.getParameter(node, 'url');
    const headersRaw = this.getParameter(node, 'headers', '{}');
    const bodyRaw = this.getParameter(node, 'body', '');
    const queryParamsRaw = this.getParameter(node, 'queryParams', '{}');
    const authType = this.getParameter(node, 'authType', 'none');
    const authToken = this.getParameter(node, 'authToken', '');
    const apiKeyHeader = this.getParameter(node, 'apiKeyHeader', 'X-API-Key');
    const timeout = this.getParameter(node, 'timeout', 30000);
    const followRedirects = this.getParameter(node, 'followRedirects', true);
    const ignoreSSLErrors = this.getParameter(node, 'ignoreSSLErrors', false);

    if (!url) {
      throw new Error('URL is required for HTTP Request node');
    }

    // Parse headers
    let headers: Record<string, string> = {};
    try {
      headers = typeof headersRaw === 'string' ? JSON.parse(headersRaw || '{}') : headersRaw || {};
    } catch {
      throw new Error('Headers must be a valid JSON object');
    }

    // Parse query params
    let queryParams: Record<string, string> = {};
    try {
      queryParams = typeof queryParamsRaw === 'string' ? JSON.parse(queryParamsRaw || '{}') : queryParamsRaw || {};
    } catch {
      throw new Error('Query Parameters must be a valid JSON object');
    }

    // Parse body
    let bodyData: any;
    if (bodyRaw) {
      try {
        bodyData = typeof bodyRaw === 'string' ? JSON.parse(bodyRaw) : bodyRaw;
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      } catch {
        // Not JSON — send as raw string
        bodyData = bodyRaw;
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'text/plain';
        }
      }
    }

    // Apply authentication
    switch (authType) {
      case 'bearer':
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
        break;
      case 'basic':
        if (authToken) {
          const encoded = Buffer.from(authToken).toString('base64');
          headers['Authorization'] = `Basic ${encoded}`;
        }
        break;
      case 'apikey':
        if (authToken) headers[apiKeyHeader] = authToken;
        break;
    }

    // Build axios config
    const config: AxiosRequestConfig = {
      method: method.toLowerCase() as any,
      url,
      headers,
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      data: bodyData,
      timeout,
      maxRedirects: followRedirects ? 5 : 0,
      validateStatus: () => true, // Don't throw on non-2xx — return the status to the user
    };

    if (ignoreSSLErrors) {
      const https = require('https');
      config.httpsAgent = new https.Agent({ rejectUnauthorized: false });
    }

    const startTime = Date.now();

    try {
      const response = await axios(config);
      const duration = Date.now() - startTime;

      return {
        ...inputData,
        statusCode: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: response.data,
        duration,
        url,
        method,
        success: response.status >= 200 && response.status < 300
      };
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        throw new Error(`HTTP Request timed out after ${timeout}ms: ${url}`);
      }
      if (error.code === 'ENOTFOUND') {
        throw new Error(`HTTP Request failed: Could not resolve host "${url}"`);
      }
      throw new Error(`HTTP Request failed: ${error.message}`);
    }
  }
}