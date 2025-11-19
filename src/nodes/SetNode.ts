import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

export class SetNode extends BaseNode {
  nodeType: NodeType = {
    name: 'set',
    displayName: 'Set',
    description: 'Set values in the data',
    group: 'Data',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      {
        name: 'values',
        displayName: 'Values',
        type: 'string',
        required: true,
        default: '{"key": "value"}'
      }
    ]
  };

  async execute(
    node: WorkflowNode,
    inputData: Record<string, any>
  ): Promise<Record<string, any>> {
    const values = this.getParameter(node, 'values', '{}');
    
    try {
      const parsedValues = JSON.parse(values);
      return { ...inputData, ...parsedValues };
    } catch (error) {
      throw new Error(`Invalid JSON in Set node: ${error}`);
    }
  }
}