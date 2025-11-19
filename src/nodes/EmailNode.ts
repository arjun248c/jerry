import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

export class EmailNode extends BaseNode {
  nodeType: NodeType = {
    name: 'email',
    displayName: 'Send Email',
    description: 'Send email notifications',
    group: 'Communication',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      {
        name: 'to',
        displayName: 'To',
        type: 'string',
        required: true,
        default: ''
      },
      {
        name: 'subject',
        displayName: 'Subject',
        type: 'string',
        required: true,
        default: ''
      },
      {
        name: 'body',
        displayName: 'Body',
        type: 'string',
        required: true,
        default: ''
      },
      {
        name: 'from',
        displayName: 'From',
        type: 'string',
        required: false,
        default: 'noreply@workflow.com'
      }
    ]
  };

  async execute(
    node: WorkflowNode,
    inputData: Record<string, any>
  ): Promise<Record<string, any>> {
    const to = this.getParameter(node, 'to');
    const subject = this.getParameter(node, 'subject');
    const body = this.getParameter(node, 'body');
    const from = this.getParameter(node, 'from', 'noreply@workflow.com');

    if (!to || !subject || !body) {
      throw new Error('To, Subject, and Body are required for Email node');
    }

    // Simulate email sending (in real implementation, use nodemailer or similar)
    console.log(`[Email Node] Sending email:
      From: ${from}
      To: ${to}
      Subject: ${subject}
      Body: ${body}`);

    return {
      ...inputData,
      emailSent: true,
      emailDetails: {
        to,
        subject,
        body,
        from,
        sentAt: new Date().toISOString()
      }
    };
  }
}