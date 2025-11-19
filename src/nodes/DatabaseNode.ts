import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

export class DatabaseNode extends BaseNode {
  nodeType: NodeType = {
    name: 'database',
    displayName: 'Database',
    description: 'Execute database queries',
    group: 'Data',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      {
        name: 'operation',
        displayName: 'Operation',
        type: 'options',
        required: true,
        default: 'select',
        options: [
          { name: 'Select', value: 'select' },
          { name: 'Insert', value: 'insert' },
          { name: 'Update', value: 'update' },
          { name: 'Delete', value: 'delete' }
        ]
      },
      {
        name: 'query',
        displayName: 'SQL Query',
        type: 'string',
        required: true,
        default: 'SELECT * FROM table_name'
      },
      {
        name: 'connectionString',
        displayName: 'Connection String',
        type: 'string',
        required: false,
        default: 'sqlite://./workflow.db'
      }
    ]
  };

  async execute(
    node: WorkflowNode,
    inputData: Record<string, any>
  ): Promise<Record<string, any>> {
    const operation = this.getParameter(node, 'operation', 'select');
    const query = this.getParameter(node, 'query');
    const connectionString = this.getParameter(node, 'connectionString', 'sqlite://./workflow.db');

    if (!query) {
      throw new Error('SQL Query is required for Database node');
    }

    // Simulate database operation (in real implementation, use appropriate database driver)
    console.log(`[Database Node] Executing ${operation.toUpperCase()} query:
      Connection: ${connectionString}
      Query: ${query}`);

    // Mock result based on operation type
    let result;
    switch (operation) {
      case 'select':
        result = [
          { id: 1, name: 'Sample Record 1', created_at: new Date().toISOString() },
          { id: 2, name: 'Sample Record 2', created_at: new Date().toISOString() }
        ];
        break;
      case 'insert':
        result = { insertedId: Math.floor(Math.random() * 1000), affectedRows: 1 };
        break;
      case 'update':
        result = { affectedRows: 1 };
        break;
      case 'delete':
        result = { deletedRows: 1 };
        break;
      default:
        result = { success: true };
    }

    return {
      ...inputData,
      databaseResult: result,
      query,
      operation
    };
  }
}