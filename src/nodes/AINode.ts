import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';
import axios from 'axios';

export class AINode extends BaseNode {
  nodeType: NodeType = {
    name: 'ai',
    displayName: 'AI Assistant',
    description: 'Call OpenAI, Anthropic Claude, or any OpenAI-compatible API',
    group: 'AI',
    inputs: ['main'],
    outputs: ['main'],
    icon: '🤖',
    color: '#e91e63',
    version: '1.0.0',
    parameters: [
      {
        name: 'provider',
        displayName: 'AI Provider',
        type: 'options',
        required: true,
        default: 'openai',
        options: [
          { name: 'OpenAI (GPT)', value: 'openai' },
          { name: 'Anthropic Claude', value: 'claude' },
          { name: 'OpenAI-Compatible (custom base URL)', value: 'custom' }
        ]
      },
      {
        name: 'model',
        displayName: 'Model',
        type: 'string',
        required: true,
        default: 'gpt-3.5-turbo',
        placeholder: 'gpt-4, gpt-3.5-turbo, claude-3-sonnet-20240229...',
        description: 'Model name to use'
      },
      {
        name: 'prompt',
        displayName: 'User Prompt',
        type: 'string',
        required: true,
        default: 'Analyze the following data: {{input}}',
        description: 'Use {{input}} to inject the full input JSON, or {{fieldName}} for a specific field'
      },
      {
        name: 'systemPrompt',
        displayName: 'System Prompt',
        type: 'string',
        required: false,
        default: 'You are a helpful workflow automation assistant.',
        placeholder: 'You are a helpful assistant.',
        description: 'Sets the behavior/persona of the AI model'
      },
      {
        name: 'apiKey',
        displayName: 'API Key',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'sk-...',
        description: 'API key for the selected AI provider'
      },
      {
        name: 'baseUrl',
        displayName: 'Custom Base URL',
        type: 'string',
        required: false,
        default: '',
        placeholder: 'https://api.example.com/v1',
        description: 'Only for OpenAI-Compatible providers (e.g. Ollama, Together AI, Groq, etc.)'
      },
      {
        name: 'temperature',
        displayName: 'Temperature',
        type: 'number',
        required: false,
        default: 0.7,
        description: '0 = deterministic, 2 = very creative'
      },
      {
        name: 'maxTokens',
        displayName: 'Max Tokens',
        type: 'number',
        required: false,
        default: 1024,
        description: 'Maximum tokens in the response'
      },
      {
        name: 'outputField',
        displayName: 'Output Field Name',
        type: 'string',
        required: false,
        default: 'aiResponse',
        description: 'Name of the field in the output that contains the AI response text'
      }
    ]
  };

  async execute(
    node: WorkflowNode,
    inputData: Record<string, any>,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    const provider = this.getParameter(node, 'provider', 'openai');
    const model = this.getParameter(node, 'model', 'gpt-3.5-turbo');
    const promptTemplate = this.getParameter(node, 'prompt', '');
    const systemPrompt = this.getParameter(node, 'systemPrompt', 'You are a helpful workflow automation assistant.');
    const apiKey = this.getParameter(node, 'apiKey', '');
    const baseUrl = this.getParameter(node, 'baseUrl', '');
    const temperature = Number(this.getParameter(node, 'temperature', 0.7));
    const maxTokens = Number(this.getParameter(node, 'maxTokens', 1024));
    const outputField = this.getParameter(node, 'outputField', 'aiResponse');

    if (!apiKey) {
      throw new Error('API Key is required for AI Assistant node');
    }

    if (!promptTemplate) {
      throw new Error('Prompt is required for AI Assistant node');
    }

    // Interpolate {{input}} and {{fieldName}} placeholders
    const resolvedPrompt = promptTemplate.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => {
      if (key === 'input') return JSON.stringify(inputData, null, 2);
      return inputData[key] !== undefined ? String(inputData[key]) : `{{${key}}}`;
    });

    console.log(`[AI Node] Calling ${provider} / ${model}`);
    const startTime = Date.now();

    try {
      let responseText: string;
      let tokensUsed = 0;

      if (provider === 'openai' || provider === 'custom') {
        const result = await this.callOpenAICompatible({
          apiKey,
          model,
          systemPrompt,
          userPrompt: resolvedPrompt,
          temperature,
          maxTokens,
          baseUrl: provider === 'custom' && baseUrl ? baseUrl : 'https://api.openai.com/v1'
        });
        responseText = result.text;
        tokensUsed = result.tokensUsed;
      } else if (provider === 'claude') {
        const result = await this.callClaude({
          apiKey,
          model,
          systemPrompt,
          userPrompt: resolvedPrompt,
          temperature,
          maxTokens
        });
        responseText = result.text;
        tokensUsed = result.tokensUsed;
      } else {
        throw new Error(`Unsupported AI provider: ${provider}`);
      }

      return {
        ...inputData,
        [outputField]: responseText,
        aiMetadata: {
          provider,
          model,
          tokensUsed,
          processingTime: Date.now() - startTime,
          promptLength: resolvedPrompt.length
        }
      };
    } catch (error: any) {
      throw new Error(`AI API call failed (${provider}/${model}): ${error.message}`);
    }
  }

  private async callOpenAICompatible(opts: {
    apiKey: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    temperature: number;
    maxTokens: number;
    baseUrl: string;
  }) {
    const response = await axios.post(
      `${opts.baseUrl}/chat/completions`,
      {
        model: opts.model,
        messages: [
          { role: 'system', content: opts.systemPrompt },
          { role: 'user', content: opts.userPrompt }
        ],
        temperature: opts.temperature,
        max_tokens: opts.maxTokens
      },
      {
        headers: {
          Authorization: `Bearer ${opts.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    const data = response.data;
    return {
      text: data.choices?.[0]?.message?.content ?? '',
      tokensUsed: data.usage?.total_tokens ?? 0
    };
  }

  private async callClaude(opts: {
    apiKey: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    temperature: number;
    maxTokens: number;
  }) {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: opts.model,
        system: opts.systemPrompt,
        messages: [{ role: 'user', content: opts.userPrompt }],
        temperature: opts.temperature,
        max_tokens: opts.maxTokens
      },
      {
        headers: {
          'x-api-key': opts.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    const data = response.data;
    return {
      text: data.content?.[0]?.text ?? '',
      tokensUsed: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0)
    };
  }
}