import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

export class SplitNode extends BaseNode {
  nodeType: NodeType = {
    name: 'split',
    displayName: 'Split In Batches',
    description: 'Split data into smaller batches',
    group: 'Data',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      {
        name: 'batchSize',
        displayName: 'Batch Size',
        type: 'number',
        required: true,
        default: 10
      },
      {
        name: 'splitField',
        displayName: 'Split Field',
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
    const batchSize = this.getParameter(node, 'batchSize', 10);
    const splitField = this.getParameter(node, 'splitField', '');

    let dataToSplit;
    
    if (splitField && inputData[splitField]) {
      dataToSplit = Array.isArray(inputData[splitField]) ? inputData[splitField] : [inputData[splitField]];
    } else {
      dataToSplit = Array.isArray(inputData) ? inputData : [inputData];
    }

    const batches = [];
    for (let i = 0; i < dataToSplit.length; i += batchSize) {
      batches.push(dataToSplit.slice(i, i + batchSize));
    }

    return {
      ...inputData,
      batches,
      totalBatches: batches.length,
      originalCount: dataToSplit.length,
      batchSize
    };
  }
}