import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

export class CodeNode extends BaseNode {
  nodeType: NodeType = {
    name: 'code',
    displayName: 'Code',
    description: 'Execute JavaScript code',
    group: 'Data',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      {
        name: 'jsCode',
        displayName: 'JavaScript Code',
        type: 'string',
        required: true,
        default: 'return items;'
      }
    ]
  };

  async execute(
    node: WorkflowNode,
    inputData: Record<string, any>
  ): Promise<Record<string, any>> {
    const jsCode = this.getParameter(node, 'jsCode', 'return items;');
    
    try {
      // Create a safe execution context
      const items = Array.isArray(inputData) ? inputData : [inputData];
      const context = {
        items,
        $input: inputData,
        $json: inputData,
        console: {
          log: (...args: any[]) => console.log('[Code Node]', ...args)
        },
        Math,
        Date,
        JSON
      };

      // Create function with the user code
      const func = new Function('items', '$input', '$json', 'console', 'Math', 'Date', 'JSON', jsCode);
      const result = func(context.items, context.$input, context.$json, context.console, context.Math, context.Date, context.JSON);
      
      return result || inputData;
    } catch (error: any) {
      throw new Error(`Code execution failed: ${error.message}`);
    }
  }
}