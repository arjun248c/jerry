import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';
import * as sqlite3Lib from 'sqlite3';

// Promisified SQLite helper
function runSQLite(db: sqlite3Lib.Database, sql: string, params: any[]): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (/^\s*(select|pragma|explain)/i.test(sql)) {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as any[]);
      });
    } else {
      db.run(sql, params, function (this: sqlite3Lib.RunResult, err: Error | null) {
        if (err) reject(err);
        else resolve([{ changes: this.changes, lastID: this.lastID }]);
      });
    }
  });
}

export class DatabaseNode extends BaseNode {
  nodeType: NodeType = {
    name: 'database',
    displayName: 'Database',
    description: 'Execute SQL queries against SQLite (built-in), or configure a connection string',
    group: 'Data',
    inputs: ['main'],
    outputs: ['main'],
    icon: '🗄️',
    color: '#5d4037',
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
          { name: 'Delete', value: 'delete' },
          { name: 'Custom SQL', value: 'custom' }
        ]
      },
      {
        name: 'query',
        displayName: 'SQL Query',
        type: 'string',
        required: true,
        default: 'SELECT * FROM workflows LIMIT 10',
        placeholder: 'SELECT * FROM your_table WHERE id = ?',
        description: 'SQL query to execute. Use ? for parameter placeholders.'
      },
      {
        name: 'parameters',
        displayName: 'Query Parameters (JSON array)',
        type: 'json',
        required: false,
        default: '[]',
        placeholder: '[1, "active"]',
        description: 'Array of values to bind as ? placeholders in the query'
      },
      {
        name: 'dbPath',
        displayName: 'SQLite Database Path',
        type: 'string',
        required: false,
        default: './workflow.db',
        placeholder: './my-database.db',
        description: 'Path to SQLite database file. Defaults to the built-in workflow.db.'
      }
    ]
  };

  async execute(
    node: WorkflowNode,
    inputData: Record<string, any>,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    const operation = this.getParameter(node, 'operation', 'select');
    const query = this.getParameter(node, 'query');
    const parametersRaw = this.getParameter(node, 'parameters', '[]');
    const dbPath = this.getParameter(node, 'dbPath', './workflow.db');

    if (!query) {
      throw new Error('SQL Query is required for Database node');
    }

    // Parse query parameters
    let queryParams: any[] = [];
    try {
      queryParams = typeof parametersRaw === 'string' ? JSON.parse(parametersRaw || '[]') : parametersRaw || [];
    } catch {
      throw new Error('Query Parameters must be a valid JSON array, e.g. [1, "value"]');
    }

    console.log(`[Database Node] Executing ${operation.toUpperCase()} on ${dbPath}: ${query}`);

    // Get resolved path
    const path = require('path');
    const resolvedPath = path.resolve(dbPath);

    return new Promise((resolve, reject) => {
      const sqlite3 = sqlite3Lib.verbose();
      const db = new sqlite3.Database(resolvedPath, sqlite3Lib.OPEN_READWRITE | sqlite3Lib.OPEN_CREATE, async (err) => {
        if (err) {
          reject(new Error(`Failed to open database "${resolvedPath}": ${err.message}`));
          return;
        }

        try {
          const rows = await runSQLite(db, query, queryParams);
          db.close();

          resolve({
            ...inputData,
            databaseResult: rows,
            rowCount: Array.isArray(rows) ? rows.length : 1,
            query,
            operation,
            dbPath: resolvedPath
          });
        } catch (queryErr: any) {
          db.close();
          reject(new Error(`Database query failed: ${queryErr.message}`));
        }
      });
    });
  }
}