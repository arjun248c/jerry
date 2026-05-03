import { BaseNode } from './BaseNode';
import { HttpRequestNode } from './HttpRequestNode';
import { StartNode } from './StartNode';
import { SetNode } from './SetNode';
import { IfNode } from './IfNode';
import { DelayNode } from './DelayNode';
import { WebhookNode } from './WebhookNode';
import { CodeNode } from './CodeNode';
import { EmailNode } from './EmailNode';
import { DatabaseNode } from './DatabaseNode';
import { SplitNode } from './SplitNode';
import { FilterNode } from './FilterNode';
import { ScheduleNode } from './ScheduleNode';
import { FileNode } from './FileNode';
import { TransformNode } from './TransformNode';
import { LoopNode } from './LoopNode';
import { CacheNode } from './CacheNode';
import { AINode } from './AINode';
import { WhatsAppNode } from './WhatsAppNode';
import { GmailNode } from './GmailNode';
import { GmailReaderNode } from './GmailReaderNode';
import { YouTubeNode } from './YouTubeNode';

export const nodeRegistry: Record<string, BaseNode> = {
  start: new StartNode(),
  manualTrigger: new StartNode(),
  trigger: new StartNode(),
  httpRequest: new HttpRequestNode(),
  set: new SetNode(),
  if: new IfNode(),
  delay: new DelayNode(),
  webhook: new WebhookNode(),
  code: new CodeNode(),
  email: new EmailNode(),
  database: new DatabaseNode(),
  split: new SplitNode(),
  filter: new FilterNode(),
  schedule: new ScheduleNode(),
  file: new FileNode(),
  transform: new TransformNode(),
  loop: new LoopNode(),
  cache: new CacheNode(),
  ai: new AINode(),
  whatsapp: new WhatsAppNode(),
  gmail: new GmailNode(),
  gmailReader: new GmailReaderNode(),
  youtube: new YouTubeNode()
};

export const getNodeTypes = () => {
  return Object.values(nodeRegistry).map(node => node.nodeType);
};

export const getNodesByGroup = () => {
  const nodeTypes = getNodeTypes();
  const groups: Record<string, any[]> = {};
  
  nodeTypes.forEach(nodeType => {
    if (!groups[nodeType.group]) {
      groups[nodeType.group] = [];
    }
    groups[nodeType.group].push(nodeType);
  });
  
  return groups;
};

export { BaseNode };
export * from './HttpRequestNode';
export * from './StartNode';
export * from './SetNode';
export * from './IfNode';
export * from './DelayNode';
export * from './WebhookNode';
export * from './CodeNode';
export * from './EmailNode';
export * from './DatabaseNode';
export * from './SplitNode';
export * from './FilterNode';
export * from './ScheduleNode';
export * from './FileNode';
export * from './TransformNode';
export * from './LoopNode';
export * from './CacheNode';
export * from './AINode';
export * from './WhatsAppNode';
export * from './GmailNode';
export * from './GmailReaderNode';
export * from './YouTubeNode';