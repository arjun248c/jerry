import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

export class FilterNode extends BaseNode {
  nodeType: NodeType = {
    name: 'filter',
    displayName: 'Filter',
    description: 'Filter data based on conditions',
    group: 'Data',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      {
        name: 'conditions',
        displayName: 'Filter Conditions (JSON)',
        type: 'string',
        required: true,
        default: '{"field": "status", "operator": "equals", "value": "active"}'
      }
    ]
  };

  async execute(
    node: WorkflowNode,
    inputData: Record<string, any>
  ): Promise<Record<string, any>> {
    const conditionsStr = this.getParameter(node, 'conditions', '{}');
    
    try {
      const conditions = JSON.parse(conditionsStr);
      const { field, operator, value } = conditions;

      if (!field || !operator) {
        throw new Error('Field and operator are required in filter conditions');
      }

      const dataArray = Array.isArray(inputData) ? inputData : [inputData];
      const filteredData = dataArray.filter(item => {
        const itemValue = item[field];
        
        switch (operator) {
          case 'equals':
            return itemValue === value;
          case 'not_equals':
            return itemValue !== value;
          case 'contains':
            return String(itemValue).includes(String(value));
          case 'greater_than':
            return Number(itemValue) > Number(value);
          case 'less_than':
            return Number(itemValue) < Number(value);
          case 'exists':
            return itemValue !== undefined && itemValue !== null;
          case 'not_exists':
            return itemValue === undefined || itemValue === null;
          default:
            return true;
        }
      });

      return {
        filteredData,
        originalCount: dataArray.length,
        filteredCount: filteredData.length,
        conditions
      };
    } catch (error: any) {
      throw new Error(`Filter conditions parsing failed: ${error.message}`);
    }
  }
}