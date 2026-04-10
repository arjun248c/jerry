import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

export class WhatsAppNode extends BaseNode {
  nodeType: NodeType = {
    name: 'whatsapp',
    displayName: 'WhatsApp',
    description: 'Send WhatsApp messages via WhatsApp Business API',
    group: 'Communication',
    inputs: ['main'],
    outputs: ['main'],
    icon: '💬',
    color: '#25D366',
    parameters: [
      {
        name: 'to',
        displayName: 'To (Phone Number)',
        type: 'string',
        required: true,
        default: '',
        placeholder: '+1234567890',
        description: 'Recipient phone number in international format (e.g. +1234567890)'
      },
      {
        name: 'messageType',
        displayName: 'Message Type',
        type: 'options',
        required: true,
        default: 'text',
        options: [
          { name: 'Text Message', value: 'text' },
          { name: 'Template Message', value: 'template' }
        ],
        description: 'Type of WhatsApp message to send'
      },
      {
        name: 'message',
        displayName: 'Message',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'Hello from Jerry!',
        description: 'The message text to send'
      },
      {
        name: 'phoneNumberId',
        displayName: 'Phone Number ID',
        type: 'string',
        required: false,
        default: '',
        placeholder: 'YOUR_PHONE_NUMBER_ID',
        description: 'WhatsApp Business Phone Number ID from Meta Developer Console'
      },
      {
        name: 'accessToken',
        displayName: 'Access Token',
        type: 'string',
        required: false,
        default: '',
        placeholder: 'YOUR_ACCESS_TOKEN',
        description: 'WhatsApp Business API access token from Meta Developer Console'
      }
    ]
  };

  async execute(
    node: WorkflowNode,
    inputData: Record<string, any>,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    const to = this.getParameter(node, 'to');
    const message = this.getParameter(node, 'message');
    const messageType = this.getParameter(node, 'messageType', 'text');
    const phoneNumberId = this.getParameter(node, 'phoneNumberId');
    const accessToken = this.getParameter(node, 'accessToken');

    if (!to || !message) {
      throw new Error('To and Message are required for WhatsApp node');
    }

    console.log(`[WhatsApp Node] Sending WhatsApp message:
      To: ${to}
      Type: ${messageType}
      Message: ${message}`);

    // If credentials are provided, attempt the real API call
    if (phoneNumberId && accessToken) {
      try {
        const payload = {
          messaging_product: 'whatsapp',
          to,
          type: messageType === 'text' ? 'text' : 'template',
          ...(messageType === 'text'
            ? { text: { body: message } }
            : { template: { name: message, language: { code: 'en_US' } } })
        };

        const response = await fetch(
          `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          }
        );

        const result: any = await response.json();

        if (!response.ok) {
          throw new Error(`WhatsApp API Error: ${JSON.stringify(result)}`);
        }

        return {
          ...inputData,
          whatsappSent: true,
          whatsappDetails: {
            to,
            message,
            messageType,
            messageId: result.messages?.[0]?.id,
            sentAt: new Date().toISOString(),
            apiResponse: result
          }
        };
      } catch (error: any) {
        throw new Error(`WhatsApp send failed: ${error.message}`);
      }
    }

    // Simulation mode (no credentials)
    return {
      ...inputData,
      whatsappSent: true,
      whatsappDetails: {
        to,
        message,
        messageType,
        messageId: `sim_${Date.now()}`,
        sentAt: new Date().toISOString(),
        simulated: true
      }
    };
  }
}
