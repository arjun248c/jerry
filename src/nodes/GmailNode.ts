import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

export class GmailNode extends BaseNode {
  nodeType: NodeType = {
    name: 'gmail',
    displayName: 'Gmail',
    description: 'Send emails using Gmail via Google OAuth2 or SMTP',
    group: 'Communication',
    inputs: ['main'],
    outputs: ['main'],
    icon: '📧',
    color: '#D44638',
    parameters: [
      {
        name: 'to',
        displayName: 'To',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'recipient@example.com',
        description: 'Recipient email address (comma-separated for multiple)'
      },
      {
        name: 'cc',
        displayName: 'CC',
        type: 'string',
        required: false,
        default: '',
        placeholder: 'cc@example.com',
        description: 'CC email addresses (comma-separated)'
      },
      {
        name: 'subject',
        displayName: 'Subject',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'Your subject here',
        description: 'Email subject line'
      },
      {
        name: 'body',
        displayName: 'Message Body',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'Your message here...',
        description: 'Email message body (supports HTML when HTML mode is enabled)'
      },
      {
        name: 'isHtml',
        displayName: 'Send as HTML',
        type: 'boolean',
        required: false,
        default: false,
        description: 'If enabled, the message body will be interpreted as HTML'
      },
      {
        name: 'gmailUser',
        displayName: 'Gmail Address',
        type: 'string',
        required: false,
        default: '',
        placeholder: 'yourname@gmail.com',
        description: 'Your Gmail address used to send the email'
      },
      {
        name: 'appPassword',
        displayName: 'App Password',
        type: 'string',
        required: false,
        default: '',
        placeholder: 'xxxx xxxx xxxx xxxx',
        description: 'Gmail App Password (generate from Google Account > Security > App Passwords)'
      }
    ]
  };

  async execute(
    node: WorkflowNode,
    inputData: Record<string, any>,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    const to = this.getParameter(node, 'to');
    const cc = this.getParameter(node, 'cc', '');
    const subject = this.getParameter(node, 'subject');
    const body = this.getParameter(node, 'body');
    const isHtml = this.getParameter(node, 'isHtml', false);
    const gmailUser = this.getParameter(node, 'gmailUser');
    const appPassword = this.getParameter(node, 'appPassword');

    if (!to || !subject || !body) {
      throw new Error('To, Subject, and Body are required for Gmail node');
    }

    console.log(`[Gmail Node] Sending Gmail:
      From: ${gmailUser || 'simulated@gmail.com'}
      To: ${to}
      CC: ${cc || 'none'}
      Subject: ${subject}
      HTML: ${isHtml}
      Body: ${body.substring(0, 100)}...`);

    // If credentials are provided, attempt real SMTP send via nodemailer
    if (gmailUser && appPassword) {
      try {
        // Dynamic require so nodemailer doesn't break if not installed
        const nodemailer = require('nodemailer');

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailUser,
            pass: appPassword
          }
        });

        const mailOptions: any = {
          from: gmailUser,
          to,
          subject,
          ...(isHtml ? { html: body } : { text: body })
        };

        if (cc) {
          mailOptions.cc = cc;
        }

        const info = await transporter.sendMail(mailOptions);

        return {
          ...inputData,
          gmailSent: true,
          gmailDetails: {
            from: gmailUser,
            to,
            cc: cc || undefined,
            subject,
            isHtml,
            messageId: info.messageId,
            sentAt: new Date().toISOString(),
            accepted: info.accepted,
            rejected: info.rejected
          }
        };
      } catch (error: any) {
        throw new Error(`Gmail send failed: ${error.message}`);
      }
    }

    // Simulation mode (no credentials)
    return {
      ...inputData,
      gmailSent: true,
      gmailDetails: {
        from: gmailUser || 'simulated@gmail.com',
        to,
        cc: cc || undefined,
        subject,
        isHtml,
        messageId: `sim_${Date.now()}@gmail.com`,
        sentAt: new Date().toISOString(),
        simulated: true
      }
    };
  }
}
