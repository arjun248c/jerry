import cron from 'node-cron';
import { Database } from '../database/database';
import { WorkflowEngine } from './WorkflowEngine';
import { Workflow } from '../types';

export class Scheduler {
  private db: Database;
  private engine: WorkflowEngine;
  private activeJobs: Map<string, cron.ScheduledTask> = new Map();

  constructor(db: Database, engine: WorkflowEngine) {
    this.db = db;
    this.engine = engine;
  }

  async init() {
    console.log('[Scheduler] Initializing workflow schedules...');
    await this.reloadSchedules();
  }

  async reloadSchedules() {
    // Stop all existing jobs
    for (const [workflowId, job] of this.activeJobs.entries()) {
      job.stop();
    }
    this.activeJobs.clear();

    try {
      const workflows = await this.db.getWorkflows();
      const activeWorkflows = workflows.filter(w => w.active);

      let scheduledCount = 0;

      for (const workflow of activeWorkflows) {
        // Find schedule nodes
        const scheduleNodes = workflow.nodes.filter(n => n.type === 'schedule');
        
        for (const node of scheduleNodes) {
          const cronExpression = node.parameters?.cron;
          const isEnabled = node.parameters?.enabled !== false;
          
          if (isEnabled && cronExpression && cron.validate(cronExpression)) {
            const job = cron.schedule(cronExpression, async () => {
              console.log(`[Scheduler] Triggering workflow ${workflow.name} (${workflow.id}) via schedule node ${node.name}`);
              try {
                // Execute workflow starting with the schedule trigger data
                await this.engine.executeWorkflow(workflow, {
                  triggered: true,
                  triggeredAt: new Date().toISOString(),
                  cron: cronExpression,
                  nodeId: node.id
                });
              } catch (error: any) {
                console.error(`[Scheduler] Failed to execute scheduled workflow ${workflow.id}:`, error);
              }
            }, {
              scheduled: true,
              timezone: node.parameters?.timezone || 'UTC'
            });
            
            this.activeJobs.set(`${workflow.id}_${node.id}`, job);
            scheduledCount++;
          }
        }
      }
      
      console.log(`[Scheduler] Reloaded ${scheduledCount} active schedules.`);
    } catch (error) {
      console.error('[Scheduler] Failed to reload schedules:', error);
    }
  }

  stopAll() {
    for (const job of this.activeJobs.values()) {
      job.stop();
    }
    this.activeJobs.clear();
  }
}
