import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

export class TransformNode extends BaseNode {
  nodeType: NodeType = {
    name: 'transform',
    displayName: 'Transform',
    description: 'Advanced data mapping and transformation',
    group: 'Data',
    inputs: ['main'],
    outputs: ['main'],
    icon: '🔄',
    color: '#2196f3',
    version: '1.0.0',
    parameters: [
      {
        name: 'mappings',
        displayName: 'Field Mappings',
        type: 'json',
        required: true,
        default: '[]',
        description: 'Array of field mappings: [{"source": "oldField", "target": "newField", "transform": "uppercase"}]'
      },
      {
        name: 'conditions',
        displayName: 'Conditions',
        type: 'json',
        required: false,
        default: '[]',
        description: 'Conditional transformations'
      },
      {
        name: 'removeUnmapped',
        displayName: 'Remove Unmapped Fields',
        type: 'boolean',
        required: false,
        default: false
      }
    ]
  };

  async execute(node: WorkflowNode, inputData: Record<string, any>): Promise<Record<string, any>> {
    const { mappings, conditions = '[]', removeUnmapped = false } = node.parameters;

    let parsedMappings, parsedConditions;
    try {
      parsedMappings = typeof mappings === 'string' ? JSON.parse(mappings) : mappings;
      parsedConditions = typeof conditions === 'string' ? JSON.parse(conditions) : conditions;
    } catch (error) {
      throw new Error('Invalid JSON in mappings or conditions');
    }

    if (Array.isArray(inputData)) {
      return inputData.map(item => this.transformItem(item, parsedMappings, parsedConditions, removeUnmapped));
    } else {
      return this.transformItem(inputData, parsedMappings, parsedConditions, removeUnmapped);
    }
  }

  private transformItem(item: any, mappings: any[], conditions: any[], removeUnmapped: boolean): any {
    const result: any = removeUnmapped ? {} : { ...item };

    // Apply conditions first
    for (const condition of conditions) {
      if (this.evaluateCondition(item, condition)) {
        if (condition.action === 'exclude') {
          return null; // Skip this item
        }
      }
    }

    // Apply mappings
    for (const mapping of mappings) {
      const sourceValue = this.getNestedValue(item, mapping.source);
      const transformedValue = this.applyTransform(sourceValue, mapping.transform);
      this.setNestedValue(result, mapping.target, transformedValue);
    }

    return result;
  }

  private evaluateCondition(item: any, condition: any): boolean {
    const fieldValue = this.getNestedValue(item, condition.field);
    const { operator, value } = condition;

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;
      default:
        return false;
    }
  }

  private applyTransform(value: any, transform?: string): any {
    if (!transform || value === null || value === undefined) {
      return value;
    }

    switch (transform) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      case 'number':
        return Number(value);
      case 'string':
        return String(value);
      case 'boolean':
        return Boolean(value);
      case 'date':
        return new Date(value).toISOString();
      case 'reverse':
        return String(value).split('').reverse().join('');
      case 'length':
        return Array.isArray(value) ? value.length : String(value).length;
      default:
        // Custom JavaScript transform
        try {
          const func = new Function('value', `return ${transform}`);
          return func(value);
        } catch (error) {
          return value;
        }
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}