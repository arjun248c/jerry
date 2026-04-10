import React, { useState, useEffect } from 'react';
import { WorkflowTemplate, Workflow } from '../types';
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