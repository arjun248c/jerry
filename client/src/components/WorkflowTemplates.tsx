import React, { useState, useEffect } from 'react';
import { WorkflowTemplate } from '../types';
import './WorkflowTemplates.css';

interface WorkflowTemplatesProps {
  onCreateFromTemplate: (template: WorkflowTemplate) => void;
  onClose: () => void;
}

export const WorkflowTemplates: React.FC<WorkflowTemplatesProps> = ({
  onCreateFromTemplate,
  onClose
}) => {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    // Mock templates - in production, load from API
    const mockTemplates: WorkflowTemplate[] = [
      {
        id: 'template-1',
        name: 'Data Processing Pipeline',
        description: 'Process CSV data, transform it, and send email notifications',
        category: 'Data Processing',
        tags: ['csv', 'email', 'transform'],
        popularity: 95,
        workflow: {
          name: 'Data Processing Pipeline',
          description: 'Automated data processing workflow',
          nodes: [
            {
              id: 'start-1',
              type: 'start',
              name: 'Start',
              position: { x: 50, y: 100 },
              parameters: {}
            },
            {
              id: 'file-1',
              type: 'file',
              name: 'Read CSV',
              position: { x: 250, y: 100 },
              parameters: {
                operation: 'read',
                filePath: '/data/input.csv',
                format: 'csv'
              }
            },
            {
              id: 'transform-1',
              type: 'transform',
              name: 'Transform Data',
              position: { x: 450, y: 100 },
              parameters: {
                mappings: JSON.stringify([
                  { source: 'name', target: 'fullName', transform: 'uppercase' },
                  { source: 'email', target: 'emailAddress' }
                ])
              }
            },
            {
              id: 'email-1',
              type: 'email',
              name: 'Send Notification',
              position: { x: 650, y: 100 },
              parameters: {
                to: 'admin@company.com',
                subject: 'Data Processing Complete',
                body: 'The data processing pipeline has completed successfully.'
              }
            }
          ],
          connections: [
            { id: 'conn-1', sourceNodeId: 'start-1', targetNodeId: 'file-1' },
            { id: 'conn-2', sourceNodeId: 'file-1', targetNodeId: 'transform-1' },
            { id: 'conn-3', sourceNodeId: 'transform-1', targetNodeId: 'email-1' }
          ]
        }
      },
      {
        id: 'template-2',
        name: 'API Integration Workflow',
        description: 'Fetch data from external API, process it, and store in database',
        category: 'Integration',
        tags: ['api', 'database', 'http'],
        popularity: 87,
        workflow: {
          name: 'API Integration Workflow',
          description: 'Automated API data integration',
          nodes: [
            {
              id: 'schedule-1',
              type: 'schedule',
              name: 'Daily Trigger',
              position: { x: 50, y: 100 },
              parameters: {
                cron: '0 9 * * *',
                timezone: 'UTC'
              }
            },
            {
              id: 'http-1',
              type: 'httpRequest',
              name: 'Fetch Data',
              position: { x: 250, y: 100 },
              parameters: {
                method: 'GET',
                url: 'https://api.example.com/data',
                headers: JSON.stringify({ 'Authorization': 'Bearer {{token}}' })
              }
            },
            {
              id: 'filter-1',
              type: 'filter',
              name: 'Filter Records',
              position: { x: 450, y: 100 },
              parameters: {
                condition: 'status === "active"'
              }
            },
            {
              id: 'database-1',
              type: 'database',
              name: 'Store Data',
              position: { x: 650, y: 100 },
              parameters: {
                operation: 'insert',
                query: 'INSERT INTO records (data) VALUES (?)'
              }
            }
          ],
          connections: [
            { id: 'conn-1', sourceNodeId: 'schedule-1', targetNodeId: 'http-1' },
            { id: 'conn-2', sourceNodeId: 'http-1', targetNodeId: 'filter-1' },
            { id: 'conn-3', sourceNodeId: 'filter-1', targetNodeId: 'database-1' }
          ]
        }
      },
      {
        id: 'template-3',
        name: 'AI Content Analysis',
        description: 'Analyze content using AI and generate reports',
        category: 'AI & ML',
        tags: ['ai', 'analysis', 'content'],
        popularity: 78,
        workflow: {
          name: 'AI Content Analysis',
          description: 'Automated content analysis using AI',
          nodes: [
            {
              id: 'webhook-1',
              type: 'webhook',
              name: 'Content Webhook',
              position: { x: 50, y: 100 },
              parameters: {}
            },
            {
              id: 'ai-1',
              type: 'ai',
              name: 'Analyze Content',
              position: { x: 250, y: 100 },
              parameters: {
                provider: 'openai',
                model: 'gpt-3.5-turbo',
                prompt: 'Analyze the following content for sentiment and key topics: {{input}}'
              }
            },
            {
              id: 'set-1',
              type: 'set',
              name: 'Format Results',
              position: { x: 450, y: 100 },
              parameters: {
                values: JSON.stringify({
                  'analysis_date': '{{$now}}',
                  'content_id': '{{input.id}}',
                  'ai_analysis': '{{ai_response}}'
                })
              }
            },
            {
              id: 'file-1',
              type: 'file',
              name: 'Save Report',
              position: { x: 650, y: 100 },
              parameters: {
                operation: 'write',
                filePath: '/reports/analysis_{{$timestamp}}.json',
                format: 'json'
              }
            }
          ],
          connections: [
            { id: 'conn-1', sourceNodeId: 'webhook-1', targetNodeId: 'ai-1' },
            { id: 'conn-2', sourceNodeId: 'ai-1', targetNodeId: 'set-1' },
            { id: 'conn-3', sourceNodeId: 'set-1', targetNodeId: 'file-1' }
          ]
        }
      },
      {
        id: 'template-4',
        name: 'Batch Processing System',
        description: 'Process large datasets in batches with error handling',
        category: 'Data Processing',
        tags: ['batch', 'loop', 'error-handling'],
        popularity: 82,
        workflow: {
          name: 'Batch Processing System',
          description: 'Efficient batch processing with error handling',
          nodes: [
            {
              id: 'start-1',
              type: 'start',
              name: 'Start',
              position: { x: 50, y: 100 },
              parameters: {}
            },
            {
              id: 'file-1',
              type: 'file',
              name: 'Load Dataset',
              position: { x: 200, y: 100 },
              parameters: {
                operation: 'read',
                filePath: '/data/large_dataset.json',
                format: 'json'
              }
            },
            {
              id: 'loop-1',
              type: 'loop',
              name: 'Process Batches',
              position: { x: 350, y: 100 },
              parameters: {
                items: 'data',
                batchSize: 100,
                parallel: true
              }
            },
            {
              id: 'transform-1',
              type: 'transform',
              name: 'Transform Item',
              position: { x: 500, y: 100 },
              parameters: {
                mappings: JSON.stringify([
                  { source: 'raw_data', target: 'processed_data', transform: 'JSON.stringify(value)' }
                ])
              }
            },
            {
              id: 'cache-1',
              type: 'cache',
              name: 'Cache Results',
              position: { x: 650, y: 100 },
              parameters: {
                operation: 'set',
                key: 'batch_{{$index}}',
                ttl: 3600
              }
            }
          ],
          connections: [
            { id: 'conn-1', sourceNodeId: 'start-1', targetNodeId: 'file-1' },
            { id: 'conn-2', sourceNodeId: 'file-1', targetNodeId: 'loop-1' },
            { id: 'conn-3', sourceNodeId: 'loop-1', targetNodeId: 'transform-1' },
            { id: 'conn-4', sourceNodeId: 'transform-1', targetNodeId: 'cache-1' }
          ]
        }
      },
      {
        id: 'template-5',
        name: 'Monitoring & Alerts',
        description: 'Monitor system health and send alerts when issues are detected',
        category: 'Monitoring',
        tags: ['monitoring', 'alerts', 'health-check'],
        popularity: 91,
        workflow: {
          name: 'System Monitoring',
          description: 'Automated system monitoring and alerting',
          nodes: [
            {
              id: 'schedule-1',
              type: 'schedule',
              name: 'Every 5 Minutes',
              position: { x: 50, y: 100 },
              parameters: {
                cron: '*/5 * * * *',
                timezone: 'UTC'
              }
            },
            {
              id: 'http-1',
              type: 'httpRequest',
              name: 'Health Check',
              position: { x: 200, y: 100 },
              parameters: {
                method: 'GET',
                url: 'https://api.myservice.com/health',
                timeout: 10000
              }
            },
            {
              id: 'if-1',
              type: 'if',
              name: 'Check Status',
              position: { x: 350, y: 100 },
              parameters: {
                condition: 'status !== 200'
              }
            },
            {
              id: 'email-1',
              type: 'email',
              name: 'Send Alert',
              position: { x: 500, y: 50 },
              parameters: {
                to: 'ops-team@company.com',
                subject: 'ALERT: Service Health Check Failed',
                body: 'Service health check failed. Status: {{status}}, Response: {{response}}'
              }
            },
            {
              id: 'cache-1',
              type: 'cache',
              name: 'Log Success',
              position: { x: 500, y: 150 },
              parameters: {
                operation: 'set',
                key: 'last_health_check',
                value: '{{$now}}'
              }
            }
          ],
          connections: [
            { id: 'conn-1', sourceNodeId: 'schedule-1', targetNodeId: 'http-1' },
            { id: 'conn-2', sourceNodeId: 'http-1', targetNodeId: 'if-1' },
            { id: 'conn-3', sourceNodeId: 'if-1', targetNodeId: 'email-1' },
            { id: 'conn-4', sourceNodeId: 'if-1', targetNodeId: 'cache-1' }
          ]
        }
      },

      // ── EMAIL → WHATSAPP TEMPLATES ──────────────────────────────────────────
      {
        id: 'template-6',
        name: '📧→💬 Email to WhatsApp Alert',
        description: 'When a new email arrives from a specific sender, automatically forward a summary as a WhatsApp message to one or more phone numbers.',
        category: 'Email & WhatsApp',
        tags: ['email', 'whatsapp', 'automation', 'alert', 'gmail'],
        popularity: 97,
        workflow: {
          name: 'Email to WhatsApp Alert',
          description: 'Auto-forward emails from specific senders to WhatsApp contacts',
          nodes: [
            {
              id: 'schedule-ew1',
              type: 'schedule',
              name: '⏰ Check Emails Every 5 Min',
              position: { x: 50, y: 150 },
              parameters: {
                cron: '*/5 * * * *',
                description: 'Polls Gmail inbox every 5 minutes'
              }
            },
            {
              id: 'gmail-ew1',
              type: 'gmailReader',
              name: '📥 Read Gmail Inbox',
              position: { x: 270, y: 150 },
              parameters: {
                user: 'your-email@gmail.com',
                appPassword: 'YOUR_GMAIL_APP_PASSWORD',
                limit: 5,
                description: 'Fetches the latest 5 unread emails'
              }
            },
            {
              id: 'if-ew1',
              type: 'if',
              name: '🔍 Filter by Sender',
              position: { x: 490, y: 150 },
              parameters: {
                condition: 'email.from.includes("boss@company.com")',
                description: 'Only process emails from this specific sender. Change to your desired sender email.'
              }
            },
            {
              id: 'transform-ew1',
              type: 'transform',
              name: '✏️ Format WhatsApp Message',
              position: { x: 710, y: 80 },
              parameters: {
                mapping: JSON.stringify({
                  message: '📧 *New Email Alert!*\n\n*From:* {{email.from}}\n*Subject:* {{email.subject}}\n*Preview:* {{email.snippet}}\n\n_Received at {{email.date}}_'
                }),
                description: 'Formats the email details into a clean WhatsApp message'
              }
            },
            {
              id: 'whatsapp-ew1',
              type: 'whatsapp',
              name: '💬 Send WhatsApp Message',
              position: { x: 930, y: 80 },
              parameters: {
                to: '+1234567890',
                message: '📧 *New Email Alert!*\n\n*From:* {{email.from}}\n*Subject:* {{email.subject}}\n*Preview:* {{email.snippet}}',
                accessToken: 'YOUR_WHATSAPP_ACCESS_TOKEN',
                phoneNumberId: 'YOUR_PHONE_NUMBER_ID',
                description: 'Sends the formatted message to the WhatsApp number. Add multiple numbers by duplicating this node.'
              }
            }
          ],
          connections: [
            { id: 'c1', sourceNodeId: 'schedule-ew1', targetNodeId: 'gmail-ew1' },
            { id: 'c2', sourceNodeId: 'gmail-ew1', targetNodeId: 'if-ew1' },
            { id: 'c3', sourceNodeId: 'if-ew1', targetNodeId: 'transform-ew1' },
            { id: 'c4', sourceNodeId: 'transform-ew1', targetNodeId: 'whatsapp-ew1' }
          ]
        }
      },
      {
        id: 'template-7',
        name: '🚨 VIP Email → WhatsApp Group Broadcast',
        description: 'Monitor your inbox for emails from VIP senders and instantly broadcast the message to multiple WhatsApp numbers (team, family, group).',
        category: 'Email & WhatsApp',
        tags: ['email', 'whatsapp', 'broadcast', 'vip', 'group', 'gmail'],
        popularity: 93,
        workflow: {
          name: 'VIP Email to WhatsApp Group Broadcast',
          description: 'Broadcast VIP emails to multiple WhatsApp contacts simultaneously',
          nodes: [
            {
              id: 'schedule-vip1',
              type: 'schedule',
              name: '⏰ Check Every 2 Minutes',
              position: { x: 50, y: 200 },
              parameters: {
                cron: '*/2 * * * *',
                description: 'Frequent polling for urgent VIP emails'
              }
            },
            {
              id: 'gmail-vip1',
              type: 'gmailReader',
              name: '📥 Read VIP Emails',
              position: { x: 270, y: 200 },
              parameters: {
                user: 'your-email@gmail.com',
                appPassword: 'YOUR_GMAIL_APP_PASSWORD',
                limit: 3,
                description: 'Reads the latest 3 unread emails'
              }
            },
            {
              id: 'if-vip1',
              type: 'if',
              name: '⭐ Is VIP Sender?',
              position: { x: 490, y: 200 },
              parameters: {
                condition: 'email.from.includes("ceo@company.com") || email.from.includes("client@bigcorp.com")',
                description: 'Checks if the email is from any of your VIP senders. Add more with ||.'
              }
            },
            {
              id: 'transform-vip1',
              type: 'transform',
              name: '✏️ Format Broadcast Message',
              position: { x: 710, y: 130 },
              parameters: {
                mapping: JSON.stringify({
                  message: '🚨 *URGENT EMAIL ALERT*\n\n*From:* {{email.from}}\n*Subject:* {{email.subject}}\n\n{{email.snippet}}\n\n_Please check your email immediately!_'
                }),
                description: 'Creates a formatted broadcast message'
              }
            },
            {
              id: 'whatsapp-vip1',
              type: 'whatsapp',
              name: '💬 Send to Person 1',
              position: { x: 930, y: 50 },
              parameters: {
                to: '+1111111111',
                message: '🚨 *URGENT:* Email from {{email.from}}\n*Subject:* {{email.subject}}\n\n{{email.snippet}}',
                accessToken: 'YOUR_WHATSAPP_ACCESS_TOKEN',
                phoneNumberId: 'YOUR_PHONE_NUMBER_ID',
                description: 'First recipient — e.g. Team Lead'
              }
            },
            {
              id: 'whatsapp-vip2',
              type: 'whatsapp',
              name: '💬 Send to Person 2',
              position: { x: 930, y: 200 },
              parameters: {
                to: '+2222222222',
                message: '🚨 *URGENT:* Email from {{email.from}}\n*Subject:* {{email.subject}}\n\n{{email.snippet}}',
                accessToken: 'YOUR_WHATSAPP_ACCESS_TOKEN',
                phoneNumberId: 'YOUR_PHONE_NUMBER_ID',
                description: 'Second recipient — e.g. Manager'
              }
            },
            {
              id: 'whatsapp-vip3',
              type: 'whatsapp',
              name: '💬 Send to Person 3',
              position: { x: 930, y: 350 },
              parameters: {
                to: '+3333333333',
                message: '🚨 *URGENT:* Email from {{email.from}}\n*Subject:* {{email.subject}}\n\n{{email.snippet}}',
                accessToken: 'YOUR_WHATSAPP_ACCESS_TOKEN',
                phoneNumberId: 'YOUR_PHONE_NUMBER_ID',
                description: 'Third recipient — duplicate to add more people'
              }
            }
          ],
          connections: [
            { id: 'c1', sourceNodeId: 'schedule-vip1', targetNodeId: 'gmail-vip1' },
            { id: 'c2', sourceNodeId: 'gmail-vip1', targetNodeId: 'if-vip1' },
            { id: 'c3', sourceNodeId: 'if-vip1', targetNodeId: 'transform-vip1' },
            { id: 'c4', sourceNodeId: 'transform-vip1', targetNodeId: 'whatsapp-vip1' },
            { id: 'c5', sourceNodeId: 'transform-vip1', targetNodeId: 'whatsapp-vip2' },
            { id: 'c6', sourceNodeId: 'transform-vip1', targetNodeId: 'whatsapp-vip3' }
          ]
        }
      },
      {
        id: 'template-8',
        name: '📰 Newsletter → WhatsApp Daily Digest',
        description: 'Every morning, fetch your newsletter/digest emails and send a summarized WhatsApp message to yourself or your team as a daily briefing.',
        category: 'Email & WhatsApp',
        tags: ['email', 'whatsapp', 'newsletter', 'digest', 'daily', 'summary'],
        popularity: 88,
        workflow: {
          name: 'Newsletter to WhatsApp Daily Digest',
          description: 'Daily morning email digest sent to WhatsApp',
          nodes: [
            {
              id: 'schedule-nd1',
              type: 'schedule',
              name: '⏰ Every Morning at 8 AM',
              position: { x: 50, y: 200 },
              parameters: {
                cron: '0 8 * * *',
                description: 'Runs every day at 8:00 AM'
              }
            },
            {
              id: 'gmail-nd1',
              type: 'gmailReader',
              name: '📥 Fetch Newsletters',
              position: { x: 270, y: 200 },
              parameters: {
                user: 'your-email@gmail.com',
                appPassword: 'YOUR_GMAIL_APP_PASSWORD',
                limit: 10,
                description: 'Reads latest 10 emails — filters newsletters below'
              }
            },
            {
              id: 'filter-nd1',
              type: 'filter',
              name: '📋 Keep Newsletters Only',
              position: { x: 490, y: 200 },
              parameters: {
                condition: 'item.from.includes("newsletter") || item.subject.toLowerCase().includes("digest") || item.subject.toLowerCase().includes("daily")',
                description: 'Filters to keep only newsletter/digest emails'
              }
            },
            {
              id: 'transform-nd1',
              type: 'transform',
              name: '✏️ Build Digest Message',
              position: { x: 710, y: 200 },
              parameters: {
                mapping: JSON.stringify({
                  message: '📰 *Your Daily Email Digest*\n━━━━━━━━━━━━━━━\n{{#each emails}}\n📌 *{{this.subject}}*\n   From: {{this.from}}\n   {{this.snippet}}\n\n{{/each}}\n━━━━━━━━━━━━━━━\n_Generated at 8 AM_'
                }),
                description: 'Combines all newsletters into one WhatsApp message'
              }
            },
            {
              id: 'whatsapp-nd1',
              type: 'whatsapp',
              name: '💬 Send Morning Digest',
              position: { x: 930, y: 200 },
              parameters: {
                to: '+1234567890',
                message: '📰 *Your Daily Email Digest*\n\nGood morning! Here are your latest updates:\n\n{{digest_summary}}\n\n_Have a great day! 🌟_',
                accessToken: 'YOUR_WHATSAPP_ACCESS_TOKEN',
                phoneNumberId: 'YOUR_PHONE_NUMBER_ID',
                description: 'Sends the morning digest to your WhatsApp'
              }
            }
          ],
          connections: [
            { id: 'c1', sourceNodeId: 'schedule-nd1', targetNodeId: 'gmail-nd1' },
            { id: 'c2', sourceNodeId: 'gmail-nd1', targetNodeId: 'filter-nd1' },
            { id: 'c3', sourceNodeId: 'filter-nd1', targetNodeId: 'transform-nd1' },
            { id: 'c4', sourceNodeId: 'transform-nd1', targetNodeId: 'whatsapp-nd1' }
          ]
        }
      }
    ];

    setTemplates(mockTemplates);

  };

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="workflow-templates-modal">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content">
        <div className="modal-header">
          <h2>Workflow Templates</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="templates-filters">
          <div className="search-section">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="category-filters">
            {categories.map(category => (
              <button
                key={category}
                className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'all' ? 'All Categories' : category}
              </button>
            ))}
          </div>
        </div>

        <div className="templates-grid">
          {filteredTemplates.map(template => (
            <div key={template.id} className="template-card">
              <div className="template-header">
                <h3 className="template-name">{template.name}</h3>
                <div className="template-popularity">
                  <span className="popularity-score">{template.popularity}%</span>
                  <span className="popularity-label">Popular</span>
                </div>
              </div>
              
              <p className="template-description">{template.description}</p>
              
              <div className="template-tags">
                {template.tags.map(tag => (
                  <span key={tag} className="template-tag">{tag}</span>
                ))}
              </div>
              
              <div className="template-stats">
                <div className="stat-item">
                  <span className="stat-number">{template.workflow.nodes?.length || 0}</span>
                  <span className="stat-label">Nodes</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{template.workflow.connections?.length || 0}</span>
                  <span className="stat-label">Connections</span>
                </div>
              </div>
              
              <div className="template-actions">
                <button
                  className="btn-primary"
                  onClick={() => onCreateFromTemplate(template)}
                >
                  Use Template
                </button>
                <button className="btn-secondary">
                  Preview
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="empty-templates">
            <div className="empty-icon">📋</div>
            <h3>No templates found</h3>
            <p>Try adjusting your search or category filter</p>
          </div>
        )}
      </div>
    </div>
  );
};