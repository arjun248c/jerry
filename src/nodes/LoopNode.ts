import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

export class LoopNode extends BaseNode {
  nodeType: NodeType = {
    name: 'loop',
    displayName: 'Loop',
    description: 'Iterate over arrays or objects',
    group: 'Logic',
    inputs: ['main'],
    outputs: ['main', 'item'],
    icon: '🔁',
    color: '#4caf50',
    version: '1.0.0',
    parameters: [
      {
        name: 'items',
        displayName: 'Items Path',
        type: 'string',
        required: true,
        default: 'items',
        description: 'Path to array/object to iterate over'
      },
      {
        name: 'batchSize',
        displayName: 'Batch Size',
        type: 'number',
        required: false,
        default: 1,
        description: 'Number of items to process at once'
      },
      {
        name: 'parallel',
        displayName: 'Parallel Processing',
        type: 'boolean',
        required: false,
        default: false
      },
      {
        name: 'maxIterations',
        displayName: 'Max Iterations',
        type: 'number',
        required: false,
        default: 1000,
        description: 'Maximum number of iterations (safety limit)'
      }
    ]
  };

  async execute(node: WorkflowNode, inputData: Record<string, any>): Promise<Record<string, any>> {
    const { items: itemsPath, batchSize = 1, parallel = false, maxIterations = 1000 } = node.parameters;

    const items = this.getNestedValue(inputData, itemsPath);
    
    if (!Array.isArray(items) && typeof items !== 'object') {
      throw new Error(`Items at path "${itemsPath}" is not an array or object`);
    }

    const itemsArray = Array.isArray(items) ? items : Object.entries(items);
    
    if (itemsArray.length > maxIterations) {
      throw new Error(`Too many items (${itemsArray.length}). Maximum allowed: ${maxIterations}`);
    }

    const results = [];
    const batches = this.createBatches(itemsArray, batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      if (parallel) {
        const batchResults = await Promise.all(
          batch.map(item => this.processItem(item, i, inputData))
        );
        results.push(...batchResults);
      } else {
        for (const item of batch) {
          const result = await this.processItem(item, i, inputData);
          results.push(result);
        }
      }
    }

    return {
      ...inputData,
      loopResults: results,
      totalIterations: itemsArray.length,
      batchCount: batches.length
    };
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processItem(item: any, index: number, inputData: any): Promise<any> {
    return {
      item,
      index,
      originalData: inputData,
      processedAt: new Date().toISOString()
    };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}