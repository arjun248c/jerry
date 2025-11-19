import { WorkflowNode, NodeType } from '../types';

export abstract class BaseNode {
  abstract nodeType: NodeType;

  abstract execute(
    node: WorkflowNode,
    inputData: Record<string, any>,
    context: Record<string, any>
  ): Promise<Record<string, any>>;

  protected getParameter(node: WorkflowNode, paramName: string, defaultValue?: any): any {
    return node.parameters[paramName] ?? defaultValue;
  }
}