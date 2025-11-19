import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

export class StartNode extends BaseNode {
  nodeType: NodeType = {
    name: 'start',
    displayName: 'Start',
    description: 'Start point of the workflow',
    group: 'Trigger',
    inputs: [],
    outputs: ['main'],
    parameters: [
      {
        name: 'triggerData',
        displayName: 'Trigger Data',
        type: 'string',
        required: false,
        default: '{}'
      }
    ]
  };

  async execute(
    node: WorkflowNode,
    inputData: Record<string, any>
  ): Promise<Record<string, any>> {
    const triggerData = this.getParameter(node, 'triggerData', '{}');
    
    try {
      return JSON.parse(triggerData);
    } catch {
      return {};
    }
  }
}