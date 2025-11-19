# Workflow Automation Platform

A comprehensive TypeScript-based workflow automation platform similar to n8n with visual node-based editor, real-time execution monitoring, and extensive node library.

## 🚀 Features

### Core Features
- **Visual Workflow Editor**: Intuitive drag-and-drop interface for creating complex workflows
- **Real-time Execution Monitoring**: Live feedback with WebSocket connections
- **Node-based Architecture**: Extensible system with 11+ built-in node types
- **TypeScript**: Full type safety across frontend and backend
- **REST API**: Complete API for workflow management
- **SQLite Database**: Lightweight, embedded database for workflow and execution storage

### Advanced Features
- **Conditional Logic**: IF nodes with advanced condition evaluation
- **Data Transformation**: Set, Filter, Split, and Code nodes for data manipulation
- **External Integrations**: HTTP Request and Webhook nodes
- **Communication**: Email notification support
- **Database Operations**: SQL query execution capabilities
- **Real-time Updates**: WebSocket-powered live execution tracking
- **Workflow Management**: Create, edit, delete, activate/deactivate workflows
- **Execution History**: Track and monitor all workflow executions

## 🛠 Tech Stack

- **Backend**: Node.js + TypeScript + Express + WebSocket + SQLite
- **Frontend**: React + TypeScript + WebSocket Client
- **Database**: SQLite with comprehensive schema
- **Real-time**: WebSocket for live updates

## 📦 Available Nodes

### Trigger Nodes
- **Start Node**: Manual workflow trigger with custom data
- **Webhook Node**: HTTP endpoint trigger for external systems

### Data Nodes
- **Set Node**: Add or modify data fields
- **Filter Node**: Filter data based on conditions
- **Split Node**: Split data into batches
- **Code Node**: Execute custom JavaScript code

### Logic Nodes
- **IF Node**: Conditional branching with advanced operators
- **Delay Node**: Add delays between operations

### Integration Nodes
- **HTTP Request Node**: Make API calls (GET, POST, PUT, DELETE)
- **Database Node**: Execute SQL queries (SELECT, INSERT, UPDATE, DELETE)
- **Email Node**: Send email notifications

## 🚀 Quick Start

### Option 1: Automated Setup (Windows)
```bash
# Run the setup script
setup.bat

# Start the application
start.bat
```

### Option 2: Manual Setup
```bash
# Install all dependencies
npm run install:all

# Start development servers
npm run dev
```

### Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## 📁 Project Structure

```
├── src/
│   ├── server/
│   │   ├── server.ts           # Express server with WebSocket
│   │   └── WorkflowEngine.ts   # Workflow execution engine
│   ├── database/
│   │   └── database.ts         # SQLite database layer
│   ├── nodes/
│   │   ├── BaseNode.ts         # Base node class
│   │   ├── StartNode.ts        # Trigger nodes
│   │   ├── HttpRequestNode.ts  # Integration nodes
│   │   ├── SetNode.ts          # Data manipulation
│   │   ├── IfNode.ts           # Logic nodes
│   │   ├── CodeNode.ts         # Custom code execution
│   │   ├── EmailNode.ts        # Communication
│   │   ├── DatabaseNode.ts     # Database operations
│   │   ├── FilterNode.ts       # Data filtering
│   │   ├── SplitNode.ts        # Data batching
│   │   ├── DelayNode.ts        # Timing control
│   │   ├── WebhookNode.ts      # External triggers
│   │   └── index.ts            # Node registry
│   └── types/
│       └── index.ts            # Shared TypeScript types
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── WorkflowEditor.tsx    # Main editor interface
│   │   │   ├── WorkflowEditor.css    # Editor styling
│   │   │   ├── WorkflowList.tsx      # Workflow management
│   │   │   └── WorkflowList.css      # List styling
│   │   ├── services/
│   │   │   └── api.ts                # API client
│   │   ├── types/
│   │   │   └── index.ts              # Frontend types
│   │   └── App.tsx                   # Main application
│   └── package.json
├── setup.bat                         # Windows setup script
├── start.bat                         # Windows start script
└── package.json
```

## 🔧 API Endpoints

### Workflow Management
- `GET /api/workflows` - Get all workflows
- `POST /api/workflows` - Save/update workflow
- `DELETE /api/workflows/:id` - Delete workflow
- `POST /api/workflows/:id/execute` - Execute workflow

### Execution Management
- `GET /api/workflows/:id/executions` - Get workflow executions
- `GET /api/executions` - Get all executions

### System
- `GET /api/health` - Health check
- `GET /api/node-types` - Get available node types
- `POST /webhook/:workflowId` - Webhook trigger endpoint

### WebSocket Events
- `execution_started` - Workflow execution begins
- `node_started` - Individual node execution begins
- `node_completed` - Individual node execution completes
- `execution_completed` - Workflow execution succeeds
- `execution_failed` - Workflow execution fails

## 🎯 Usage Examples

### Creating a Simple Workflow
1. Click "Create New Workflow"
2. Drag a "Start" node to the canvas
3. Add an "HTTP Request" node
4. Connect the nodes
5. Configure the HTTP Request URL
6. Save and execute

### Setting up a Webhook Workflow
1. Create workflow with "Webhook" trigger
2. Add processing nodes (Set, Filter, etc.)
3. Activate the workflow
4. Use the generated webhook URL: `POST /webhook/{workflowId}`

### Data Processing Pipeline
1. Start → HTTP Request (fetch data)
2. Filter → Split (process in batches)
3. Code → Set (transform data)
4. Email (send notifications)

## 🔨 Adding Custom Nodes

1. **Create Node Class**:
```typescript
import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

export class CustomNode extends BaseNode {
  nodeType: NodeType = {
    name: 'custom',
    displayName: 'Custom Node',
    description: 'Your custom functionality',
    group: 'Custom',
    inputs: ['main'],
    outputs: ['main'],
    parameters: [
      {
        name: 'param1',
        displayName: 'Parameter 1',
        type: 'string',
        required: true,
        default: ''
      }
    ]
  };

  async execute(node: WorkflowNode, inputData: Record<string, any>): Promise<Record<string, any>> {
    // Your custom logic here
    return inputData;
  }
}
```

2. **Register Node**:
```typescript
// In src/nodes/index.ts
import { CustomNode } from './CustomNode';

export const nodeRegistry: Record<string, BaseNode> = {
  // ... existing nodes
  custom: new CustomNode()
};
```

## 🐛 Troubleshooting

### Common Issues
1. **Port conflicts**: Ensure ports 3000 and 3001 are available
2. **WebSocket connection**: Check firewall settings
3. **Database issues**: Delete `workflow.db` to reset
4. **Node modules**: Run `npm run install:all` to reinstall dependencies

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev
```

## 🚀 Production Deployment

1. **Build the application**:
```bash
npm run build
```

2. **Start production server**:
```bash
npm start
```

3. **Environment Variables**:
- `PORT`: Server port (default: 3001)
- `DB_PATH`: Database file path (default: ./workflow.db)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:3000)

## 📄 License

MIT License - feel free to use this project for learning and development.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add your enhancements
4. Submit a pull request

---

**Built with ❤️ using TypeScript, React, and Node.js**