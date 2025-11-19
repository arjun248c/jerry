import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

export class IfNode extends BaseNode {
  nodeType: NodeType = {
    name: 'if',
    displayName: 'IF',
    description: 'Conditional logic node',
    group: 'Logic',
    inputs: ['main'],
    outputs: ['true', 'false'],
    parameters: [
      {
        name: 'condition',
        displayName: 'Condition',
        type: 'string',
        required: true,
        default: 'data.value > 0'
      }
    ]
  };

  async execute(
    node: WorkflowNode,
    inputData: Record<string, any>
  ): Promise<Record<string, any>> {
    const condition = this.getParameter(node, 'condition');
    
    try {
      // Simple condition evaluation
      const result = this.evaluateCondition(condition, inputData);
      return { ...inputData, _conditionResult: result };
    } catch (error) {
      throw new Error(`Condition evaluation failed: ${error}`);
    }
  }

  private evaluateCondition(condition: string, data: Record<string, any>): boolean {
    // Enhanced condition parser
    const operators = ['>=', '<=', '===', '!==', '>', '<', 'includes', 'startsWith', 'endsWith'];
    
    for (const op of operators) {
      if (condition.includes(op)) {
        const [left, right] = condition.split(op).map(s => s.trim());
        const leftVal = this.getValue(left, data);
        const rightVal = this.getValue(right, data);
        
        switch (op) {
          case '>': return Number(leftVal) > Number(rightVal);
          case '<': return Number(leftVal) < Number(rightVal);
          case '>=': return Number(leftVal) >= Number(rightVal);
          case '<=': return Number(leftVal) <= Number(rightVal);
          case '===': return leftVal === rightVal;
          case '!==': return leftVal !== rightVal;
          case 'includes': return String(leftVal).includes(String(rightVal));
          case 'startsWith': return String(leftVal).startsWith(String(rightVal));
          case 'endsWith': return String(leftVal).endsWith(String(rightVal));
        }
      }
    }
    
    return Boolean(this.getValue(condition, data));
  }

  private getValue(expression: string, data: Record<string, any>): any {
    if (expression.startsWith('data.')) {
      const key = expression.substring(5);
      return data[key];
    }
    
    if (!isNaN(Number(expression))) {
      return Number(expression);
    }
    
    if (expression.startsWith('"') && expression.endsWith('"')) {
      return expression.slice(1, -1);
    }
    
    return expression;
  }
}