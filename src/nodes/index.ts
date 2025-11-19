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

export const nodeRegistry: Record<string, BaseNode> = {
  start: new StartNode(),
  httpRequest: new HttpRequestNode(),
  set: new SetNode(),
  if: new IfNode(),
  delay: new DelayNode(),
  webhook: new WebhookNode(),
  code: new CodeNode(),
  email: new EmailNode(),
  database: new DatabaseNode(),
  split: new SplitNode(),
  filter: new FilterNode()
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