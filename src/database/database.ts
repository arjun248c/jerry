import sqlite3 from 'sqlite3';
import { Workflow, ExecutionData } from '../types';

export class Database {
  private db: sqlite3.Database;

  constructor(dbPath: string = './workflow.db') {
    this.db = new sqlite3.Database(dbPath);
    this.initTables();
  }

  private initTables(): void {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS workflows (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          active INTEGER DEFAULT 0,
          nodes TEXT NOT NULL,
          connections TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS executions (
          id TEXT PRIMARY KEY,
          workflow_id TEXT NOT NULL,
          status TEXT NOT NULL,
          started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          finished_at DATETIME,
          data TEXT,
          error TEXT,
          FOREIGN KEY (workflow_id) REFERENCES workflows (id)
        )
      `);
    });
  }

  async saveWorkflow(workflow: Workflow): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO workflows (id, name, active, nodes, connections, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      stmt.run([
        workflow.id,
        workflow.name,
        workflow.active ? 1 : 0,
        JSON.stringify(workflow.nodes),
        JSON.stringify(workflow.connections)
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getWorkflows(): Promise<Workflow[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM workflows ORDER BY updated_at DESC', (err, rows: any[]) => {
        if (err) reject(err);
        else {
          const workflows = rows.map(row => ({
            id: row.id,
            name: row.name,
            active: row.active === 1,
            nodes: JSON.parse(row.nodes),
            connections: JSON.parse(row.connections),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
          }));
          resolve(workflows);
        }
      });
    });
  }

  async saveExecution(execution: ExecutionData): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO executions (id, workflow_id, status, started_at, finished_at, data, error)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        execution.id,
        execution.workflowId,
        execution.status,
        execution.startedAt.toISOString(),
        execution.finishedAt?.toISOString(),
        JSON.stringify(execution.data),
        execution.error
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getExecutions(workflowId?: string): Promise<ExecutionData[]> {
    return new Promise((resolve, reject) => {
      const query = workflowId 
        ? 'SELECT * FROM executions WHERE workflow_id = ? ORDER BY started_at DESC LIMIT 50'
        : 'SELECT * FROM executions ORDER BY started_at DESC LIMIT 50';
      
      const params = workflowId ? [workflowId] : [];
      
      this.db.all(query, params, (err, rows: any[]) => {
        if (err) reject(err);
        else {
          const executions = rows.map(row => ({
            id: row.id,
            workflowId: row.workflow_id,
            status: row.status,
            startedAt: new Date(row.started_at),
            finishedAt: row.finished_at ? new Date(row.finished_at) : undefined,
            data: JSON.parse(row.data || '{}'),
            error: row.error
          }));
          resolve(executions);
        }
      });
    });
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('DELETE FROM executions WHERE workflow_id = ?', [workflowId]);
        this.db.run('DELETE FROM workflows WHERE id = ?', [workflowId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }
}