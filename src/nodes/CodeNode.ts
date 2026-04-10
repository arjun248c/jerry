import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';
import { runInNewContext } from 'vm';

export class CodeNode extends BaseNode {
  nodeType: NodeType = {
    name: 'code',
    displayName: 'Code',
    description: 'Execute custom JavaScript/TypeScript-style code in a sandboxed environment',
    group: 'Data',
    inputs: ['main'],
    outputs: ['main'],
    icon: '💻',
    color: '#455a64',
    parameters: [
      {
        name: 'jsCode',
        displayName: 'JavaScript Code',
        type: 'code',
        required: true,
        default: `// Available variables: $input (the incoming data), $json, items (array)
// Return a value — the return value becomes the next node's input
const result = {
  ...items[0],
  processedAt: new Date().toISOString()
};
return result;`,
        description: 'Write JavaScript code. Use $input or items[0] to access input data. Must return a value.'
      },
      {
        name: 'timeout',
        displayName: 'Timeout (ms)',
        type: 'number',
        required: false,
        default: 5000,
        description: 'Maximum execution time in milliseconds (max: 30000)'
      },
      {
        name: 'allowAsync',
        displayName: 'Allow Async/Await',
        type: 'boolean',
        required: false,
        default: false,
        description: 'Wrap code in async function to allow await expressions'
      }
    ]
  };

  async execute(
    node: WorkflowNode,
    inputData: Record<string, any>,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    const jsCode = this.getParameter(node, 'jsCode', 'return $input;');
    const timeoutMs = Math.min(Number(this.getParameter(node, 'timeout', 5000)), 30000);
    const allowAsync = this.getParameter(node, 'allowAsync', false);

    const items = Array.isArray(inputData) ? inputData : [inputData];

    // Build the sandboxed context — no access to fs, process, require, etc.
    const sandbox: Record<string, any> = {
      $input: inputData,
      $json: inputData,
      items,
      console: {
        log: (...args: any[]) => console.log('[Code Node]', ...args),
        warn: (...args: any[]) => console.warn('[Code Node]', ...args),
        error: (...args: any[]) => console.error('[Code Node]', ...args)
      },
      Math,
      Date,
      JSON,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
      Buffer,
      __result: undefined
    };

    try {
      let wrappedCode: string;

      if (allowAsync) {
        // Wraps in async IIFE, captures result
        wrappedCode = `
          (async function() {
            ${jsCode}
          })().then(r => { __result = r; }).catch(e => { throw e; });
        `;
      } else {
        // Synchronous: wrap in function, store return value
        wrappedCode = `
          __result = (function() {
            ${jsCode}
          })();
        `;
      }

      await runInNewContext(wrappedCode, sandbox, {
        timeout: timeoutMs,
        displayErrors: true
      });

      // For async, wait a tick for the promise to settle
      if (allowAsync) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const result = sandbox.__result;

      if (result === undefined || result === null) {
        // If code returned nothing, pass through input
        return inputData;
      }

      if (typeof result !== 'object') {
        // Wrap primitives
        return { ...inputData, codeResult: result };
      }

      return result as Record<string, any>;
    } catch (error: any) {
      if (error.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
        throw new Error(`Code execution timed out after ${timeoutMs}ms`);
      }
      throw new Error(`Code execution failed: ${error.message}`);
    }
  }
}