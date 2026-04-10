import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';
import * as nodemailer from 'nodemailer';

export class EmailNode extends BaseNode {
  nodeType: NodeType = {
    name: 'email',
    displayName: 'Send Email',
    description: 'Send emails via SMTP (Gmail, Outlook, custom server)',
    group: 'Communication',
    inputs: ['main'],
    outputs: ['main'],
    icon: '✉️',
    color: '#1565c0',
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
        placeholder: 'cc@example.com'
      },
      {
        name: 'bcc',
        displayName: 'BCC',
        type: 'string',
        required: false,
        default: '',
        placeholder: 'bcc@example.com'
      },
      {
        name: 'subject',
        displayName: 'Subject',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'Your subject here'
      },
      {
        name: 'body',
        displayName: 'Message Body',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'Your message here...'
      },
      {
        name: 'isHtml',
        displayName: 'Send as HTML',
        type: 'boolean',
        required: false,
        default: false,
        description: 'If enabled, message body is interpreted as HTML'
      },
      {
        name: 'smtpHost',
        displayName: 'SMTP Host',
        type: 'string',
        required: false,
        default: 'smtp.gmail.com',
        placeholder: 'smtp.gmail.com',
        description: 'SMTP server host (e.g. smtp.gmail.com, smtp.office365.com)'
      },
      {
        name: 'smtpPort',
        displayName: 'SMTP Port',
        type: 'number',
        required: false,
        default: 587,
        description: '587 for TLS, 465 for SSL, 25 for plain'
      },
      {
        name: 'smtpUser',
        displayName: 'SMTP Username / Email',
        type: 'string',
        required: false,
        default: '',
        placeholder: 'your@email.com'
      },
      {
        name: 'smtpPassword',
        displayName: 'SMTP Password / App Password',
        type: 'string',
        required: false,
        default: '',
        placeholder: 'your-password-or-app-password'
      },
      {
        name: 'from',
        displayName: 'From Name',
        type: 'string',
        required: false,
        default: '',
        placeholder: 'Jerry Workflows',
        description: 'Display name of the sender'
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
    const bcc = this.getParameter(node, 'bcc', '');
    const subject = this.getParameter(node, 'subject');
    const body = this.getParameter(node, 'body');
    const isHtml = this.getParameter(node, 'isHtml', false);
    const smtpHost = this.getParameter(node, 'smtpHost', 'smtp.gmail.com');
    const smtpPort = this.getParameter(node, 'smtpPort', 587);
    const smtpUser = this.getParameter(node, 'smtpUser', '');
    const smtpPassword = this.getParameter(node, 'smtpPassword', '');
    const fromName = this.getParameter(node, 'from', '');

    if (!to || !subject || !body) {
      throw new Error('To, Subject, and Body are required for Email node');
    }

    const fromAddress = smtpUser
      ? (fromName ? `"${fromName}" <${smtpUser}>` : smtpUser)
      : 'noreply@workflow.local';

    console.log(`[Email Node] Sending email via ${smtpHost}:${smtpPort} to: ${to}`);

    // Simulation mode — no credentials configured
    if (!smtpUser || !smtpPassword) {
      console.warn('[Email Node] No SMTP credentials provided — running in simulation mode');
      return {
        ...inputData,
        emailSent: true,
        emailDetails: {
          from: fromAddress,
          to,
          cc: cc || undefined,
          bcc: bcc || undefined,
          subject,
          isHtml,
          messageId: `sim_${Date.now()}@workflow.local`,
          sentAt: new Date().toISOString(),
          simulated: true
        }
      };
    }

    // Real SMTP send
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword
      },
      tls: {
        rejectUnauthorized: true
      }
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: fromAddress,
      to,
      subject,
      ...(isHtml ? { html: body } : { text: body })
    };

    if (cc) mailOptions.cc = cc;
    if (bcc) mailOptions.bcc = bcc;

    try {
      const info = await transporter.sendMail(mailOptions);
      return {
        ...inputData,
        emailSent: true,
        emailDetails: {
          from: fromAddress,
          to,
          cc: cc || undefined,
          bcc: bcc || undefined,
          subject,
          isHtml,
          messageId: info.messageId,
          sentAt: new Date().toISOString(),
          accepted: info.accepted,
          rejected: info.rejected
        }
      };
    } catch (error: any) {
      throw new Error(`Email send failed: ${error.message}`);
    }
  }
}