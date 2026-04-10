import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

// Simple in-memory cache for demonstration
const cache = new Map<string, { value: any; expires: number }>();

export class CacheNode extends BaseNode {
  nodeType: NodeType = {
    name: 'cache',
    displayName: 'Cache',
    description: 'Store and retrieve temporary data',
    group: 'Data',
    inputs: ['main'],
    outputs: ['main'],
    icon: '💾',
    color: '#607d8b',
    version: '1.0.0',
    parameters: [
      {
        name: 'operation',
        displayName: 'Operation',
        type: 'options',
        required: true,
        default: 'get',
        options: [
          { name: 'Get', value: 'get' },
          { name: 'Set', value: 'set' },
          { name: 'Delete', value: 'delete' },
          { name: 'Clear All', value: 'clear' }
        ]
      },
      {
        name: 'key',
        displayName: 'Cache Key',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'my-cache-key'
      },
      {
        name: 'value',
        displayName: 'Value',
        type: 'json',
        required: false,
        default: '',
        description: 'Value to store (for set operation)'
      },
      {
        name: 'ttl',
        displayName: 'TTL (seconds)',
        type: 'number',
        required: false,
        default: 3600,
        description: 'Time to live in seconds (0 = no expiration)'
      }
    ]
  };

  async execute(node: WorkflowNode, inputData: Record<string, any>): Promise<Record<string, any>> {
    const { operation, key, value, ttl = 3600 } = node.parameters;

    if (!key && operation !== 'clear') {
      throw new Error('Cache key is required');
    }

    const now = Date.now();

    switch (operation) {
      case 'get':
        return this.getCacheValue(key, inputData, now);
      case 'set':
        return this.setCacheValue(key, value || inputData, ttl, inputData, now);
      case 'delete':
        return this.deleteCacheValue(key, inputData);
      case 'clear':
        return this.clearCache(inputData);
      default:
        throw new Error(`Unsupported cache operation: ${operation}`);
    }
  }

  private getCacheValue(key: string, inputData: any, now: number): any {
    const cached = cache.get(key);
    
    if (!cached) {
      return {
        ...inputData,
        cacheHit: false,
        cacheKey: key,
        value: null
      };
    }

    // Check if expired
    if (cached.expires > 0 && now > cached.expires) {
      cache.delete(key);
      return {
        ...inputData,
        cacheHit: false,
        cacheKey: key,
        value: null,
        expired: true
      };
    }

    return {
      ...inputData,
      cacheHit: true,
      cacheKey: key,
      value: cached.value
    };
  }

  private setCacheValue(key: string, value: any, ttl: number, inputData: any, now: number): any {
    let parsedValue = value;
    if (typeof value === 'string') {
      try {
        parsedValue = JSON.parse(value);
      } catch {
        // Keep as string if not valid JSON
      }
    }

    const expires = ttl > 0 ? now + (ttl * 1000) : 0;
    
    cache.set(key, {
      value: parsedValue,
      expires
    });

    return {
      ...inputData,
      cacheKey: key,
      cached: true,
      ttl,
      expiresAt: expires > 0 ? new Date(expires).toISOString() : null
    };
  }

  private deleteCacheValue(key: string, inputData: any): any {
    const existed = cache.has(key);
    cache.delete(key);

    return {
      ...inputData,
      cacheKey: key,
      deleted: existed
    };
  }

  private clearCache(inputData: any): any {
    const count = cache.size;
    cache.clear();

    return {
      ...inputData,
      cleared: true,
      deletedCount: count
    };
  }
}