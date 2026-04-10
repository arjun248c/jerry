import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';
import * as cron from 'node-cron';

export class ScheduleNode extends BaseNode {
  nodeType: NodeType = {
    name: 'schedule',
    displayName: 'Schedule',
    description: 'Trigger workflow on a schedule using cron expressions',
    group: 'Triggers',
    inputs: [],
    outputs: ['main'],
    icon: '⏰',
    color: '#9c27b0',
    version: '1.0.0',
    parameters: [
      {
        name: 'cron',
        displayName: 'Cron Expression',
        type: 'string',
        required: true,
        default: '0 9 * * *',
        description: 'Cron expression (e.g., "0 9 * * *" for daily at 9 AM)',
        placeholder: '0 9 * * *'
      },
      {
        name: 'timezone',
        displayName: 'Timezone',
        type: 'string',
        required: false,
        default: 'UTC',
        description: 'Timezone for the schedule'
      },
      {
        name: 'enabled',
        displayName: 'Enabled',
        type: 'boolean',
        required: false,
        default: true
      }
    ]
  };

  async execute(node: WorkflowNode, inputData: Record<string, any>): Promise<Record<string, any>> {
    const { cron: cronExpression, timezone = 'UTC', enabled = true } = node.parameters;

    if (!enabled) {
      throw new Error('Schedule is disabled');
    }

    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    return {
      ...inputData,
      scheduledAt: new Date().toISOString(),
      cronExpression,
      timezone,
      nextRun: this.getNextRun(cronExpression)
    };
  }

  private getNextRun(cronExpression: string): string {
    // Simple next run calculation - in production, use a proper cron library
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return now.toISOString();
  }
}