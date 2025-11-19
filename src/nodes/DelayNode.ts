import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

export class DelayNode extends BaseNode {
  nodeType: NodeType = {
    name: 'delay',
    displayName: 'Wait',
    description: 'Wait for a specified amount of time',
    group: 'Flow',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      {
        name: 'amount',
        displayName: 'Amount',
        type: 'number',
        required: true,
        default: 1
      },
      {
        name: 'unit',
        displayName: 'Unit',
        type: 'options',
        required: true,
        default: 'seconds',
        options: [
          { name: 'Seconds', value: 'seconds' },
          { name: 'Minutes', value: 'minutes' },
          { name: 'Hours', value: 'hours' }
        ]
      }
    ]
  };

  async execute(
    node: WorkflowNode,
    inputData: Record<string, any>
  ): Promise<Record<string, any>> {
    const amount = this.getParameter(node, 'amount', 1);
    const unit = this.getParameter(node, 'unit', 'seconds');
    
    let milliseconds = amount * 1000; // default to seconds
    
    if (unit === 'minutes') {
      milliseconds = amount * 60 * 1000;
    } else if (unit === 'hours') {
      milliseconds = amount * 60 * 60 * 1000;
    }
    
    await new Promise(resolve => setTimeout(resolve, milliseconds));
    
    return inputData;
  }
}