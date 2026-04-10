import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

export class GmailReaderNode extends BaseNode {
  nodeType: NodeType = {
    name: 'gmailReader',
    displayName: 'Gmail Reader',
    description: 'Read new/unread emails from Gmail via IMAP. Use with a Schedule node to poll inbox.',
    group: 'Communication',
    inputs: ['main'],
    outputs: ['main'],
    icon: '📬',
    color: '#C5221F',
    parameters: [
      {
        name: 'gmailUser',
        displayName: 'Gmail Address',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'yourname@gmail.com',
        description: 'Your Gmail address to read from'
      },
      {
        name: 'appPassword',
        displayName: 'App Password',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'xxxx xxxx xxxx xxxx',
        description: 'Gmail App Password — generate at Google Account > Security > App Passwords'
      },
      {
        name: 'folder',
        displayName: 'Mailbox Folder',
        type: 'string',
        required: false,
        default: 'INBOX',
        placeholder: 'INBOX',
        description: 'IMAP folder to read from (e.g. INBOX, Sent, Spam)'
      },
      {
        name: 'filter',
        displayName: 'Filter',
        type: 'options',
        required: false,
        default: 'UNSEEN',
        options: [
          { name: 'Unread Only', value: 'UNSEEN' },
          { name: 'All Emails', value: 'ALL' },
          { name: 'Today\'s Emails', value: 'TODAY' }
        ],
        description: 'Which emails to fetch'
      },
      {
        name: 'maxEmails',
        displayName: 'Max Emails to Fetch',
        type: 'number',
        required: false,
        default: 5,
        description: 'Maximum number of emails to fetch per run'
      },
      {
        name: 'markAsRead',
        displayName: 'Mark Fetched Emails as Read',
        type: 'boolean',
        required: false,
        default: true,
        description: 'Mark emails as read after fetching to avoid re-processing'
      },
      {
        name: 'includeBody',
        displayName: 'Include Email Body',
        type: 'boolean',
        required: false,
        default: true,
        description: 'Fetch full email body text (disable for faster polling with subject-only)'
      }
    ]
  };

  async execute(
    node: WorkflowNode,
    inputData: Record<string, any>,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    const gmailUser = this.getParameter(node, 'gmailUser');
    const appPassword = this.getParameter(node, 'appPassword');
    const folder = this.getParameter(node, 'folder', 'INBOX');
    const filter = this.getParameter(node, 'filter', 'UNSEEN');
    const maxEmails = Number(this.getParameter(node, 'maxEmails', 5));
    const markAsRead = this.getParameter(node, 'markAsRead', true);
    const includeBody = this.getParameter(node, 'includeBody', true);

    if (!gmailUser || !appPassword) {
      throw new Error('Gmail Address and App Password are required for Gmail Reader node');
    }

    console.log(`[Gmail Reader] Connecting to Gmail IMAP for ${gmailUser}, folder: ${folder}, filter: ${filter}`);

    // Dynamic import of imapflow
    const { ImapFlow } = require('imapflow');

    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: gmailUser,
        pass: appPassword
      },
      logger: false
    });

    const emails: any[] = [];

    try {
      await client.connect();
      await client.mailboxOpen(folder);

      // Build search criteria
      let searchCriteria: any;
      if (filter === 'TODAY') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        searchCriteria = { since: today };
      } else if (filter === 'UNSEEN') {
        searchCriteria = { seen: false };
      } else {
        searchCriteria = { all: true };
      }

      // Search and fetch emails
      const fetchOptions: any = {
        envelope: true,
        flags: true,
        ...(includeBody ? { bodyStructure: true, bodyParts: ['TEXT'] } : {})
      };

      const uids: number[] = [];
      for await (const message of client.fetch(searchCriteria, fetchOptions)) {
        if (uids.length >= maxEmails) break;

        const email: any = {
          uid: message.uid,
          subject: message.envelope?.subject || '(no subject)',
          from: message.envelope?.from?.[0]?.address || '',
          fromName: message.envelope?.from?.[0]?.name || '',
          to: message.envelope?.to?.map((t: any) => t.address).join(', ') || '',
          date: message.envelope?.date?.toISOString() || new Date().toISOString(),
          seen: message.flags?.has('\\Seen') || false,
          messageId: message.envelope?.messageId || ''
        };

        // Fetch body if needed
        if (includeBody) {
          try {
            const parts = message.bodyParts;
            if (parts && parts.size > 0) {
              const textPart = parts.get('TEXT') || parts.get('1') || parts.get('1.1');
              if (textPart) {
                email.body = textPart.toString();
              }
            }
          } catch {
            email.body = '(could not read body)';
          }
        }

        emails.push(email);
        uids.push(message.uid);
      }

      // Mark as read if configured
      if (markAsRead && uids.length > 0) {
        try {
          await client.messageFlagsAdd({ uid: uids }, ['\\Seen']);
        } catch (flagErr) {
          console.warn('[Gmail Reader] Could not mark emails as read:', flagErr);
        }
      }

      await client.logout();

      console.log(`[Gmail Reader] Fetched ${emails.length} email(s) from ${gmailUser}`);

      return {
        ...inputData,
        emails,
        emailCount: emails.length,
        folder,
        fetchedAt: new Date().toISOString(),
        hasEmails: emails.length > 0
      };
    } catch (error: any) {
      try { await client.logout(); } catch {}
      if (error.message?.includes('Invalid credentials') || error.message?.includes('AUTHENTICATIONFAILED')) {
        throw new Error(
          'Gmail IMAP login failed. Make sure:\n' +
          '1. IMAP is enabled in Gmail Settings > See all settings > Forwarding and POP/IMAP\n' +
          '2. You are using a Gmail App Password (not your regular password)\n' +
          '3. 2-Factor Authentication is enabled on your Google account'
        );
      }
      throw new Error(`Gmail Reader failed: ${error.message}`);
    }
  }
}
