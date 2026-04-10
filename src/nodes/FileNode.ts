import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class FileNode extends BaseNode {
  nodeType: NodeType = {
    name: 'file',
    displayName: 'File',
    description: 'Read, write, or manipulate files',
    group: 'Data',
    inputs: ['main'],
    outputs: ['main'],
    icon: '📁',
    color: '#ff9800',
    version: '1.0.0',
    parameters: [
      {
        name: 'operation',
        displayName: 'Operation',
        type: 'options',
        required: true,
        default: 'read',
        options: [
          { name: 'Read', value: 'read' },
          { name: 'Write', value: 'write' },
          { name: 'Append', value: 'append' },
          { name: 'Delete', value: 'delete' }
        ]
      },
      {
        name: 'filePath',
        displayName: 'File Path',
        type: 'string',
        required: true,
        default: '',
        placeholder: '/path/to/file.json'
      },
      {
        name: 'format',
        displayName: 'Format',
        type: 'options',
        required: false,
        default: 'json',
        options: [
          { name: 'JSON', value: 'json' },
          { name: 'CSV', value: 'csv' },
          { name: 'XML', value: 'xml' },
          { name: 'Text', value: 'txt' }
        ]
      },
      {
        name: 'content',
        displayName: 'Content',
        type: 'json',
        required: false,
        default: '',
        description: 'Content to write (for write/append operations)'
      },
      {
        name: 'encoding',
        displayName: 'Encoding',
        type: 'string',
        required: false,
        default: 'utf8'
      }
    ]
  };

  async execute(node: WorkflowNode, inputData: Record<string, any>): Promise<Record<string, any>> {
    const { operation, filePath, format = 'json', content, encoding = 'utf8' as BufferEncoding } = node.parameters;

    if (!filePath) {
      throw new Error('File path is required');
    }

    const resolvedPath = path.resolve(filePath);

    try {
      switch (operation) {
        case 'read':
          return await this.readFile(resolvedPath, format, encoding as BufferEncoding, inputData);
        case 'write':
          return await this.writeFile(resolvedPath, content || inputData, format, encoding as BufferEncoding, inputData);
        case 'append':
          return await this.appendFile(resolvedPath, content || inputData, format, encoding as BufferEncoding, inputData);
        case 'delete':
          return await this.deleteFile(resolvedPath, inputData);
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    } catch (error: any) {
      throw new Error(`File operation failed: ${error.message}`);
    }
  }

  private async readFile(filePath: string, format: string, encoding: BufferEncoding, inputData: any): Promise<any> {
    const content = await fs.readFile(filePath, encoding as BufferEncoding);
    
    let parsedContent;
    switch (format) {
      case 'json':
        parsedContent = JSON.parse(content);
        break;
      case 'csv':
        parsedContent = this.parseCSV(content);
        break;
      default:
        parsedContent = content;
    }

    return {
      ...inputData,
      fileContent: parsedContent,
      filePath,
      fileSize: (await fs.stat(filePath)).size
    };
  }

  private async writeFile(filePath: string, content: any, format: string, encoding: BufferEncoding, inputData: any): Promise<any> {
    let stringContent;
    switch (format) {
      case 'json':
        stringContent = JSON.stringify(content, null, 2);
        break;
      case 'csv':
        stringContent = this.formatCSV(content);
        break;
      default:
        stringContent = String(content);
    }

    await fs.writeFile(filePath, stringContent, encoding as BufferEncoding);
    
    return {
      ...inputData,
      operation: 'write',
      filePath,
      bytesWritten: Buffer.byteLength(stringContent, encoding as BufferEncoding)
    };
  }

  private async appendFile(filePath: string, content: any, format: string, encoding: BufferEncoding, inputData: any): Promise<any> {
    let stringContent;
    switch (format) {
      case 'json':
        stringContent = JSON.stringify(content, null, 2);
        break;
      default:
        stringContent = String(content);
    }

    await fs.appendFile(filePath, stringContent, encoding as BufferEncoding);
    
    return {
      ...inputData,
      operation: 'append',
      filePath,
      bytesAppended: Buffer.byteLength(stringContent, encoding as BufferEncoding)
    };
  }

  private async deleteFile(filePath: string, inputData: any): Promise<any> {
    await fs.unlink(filePath);
    
    return {
      ...inputData,
      operation: 'delete',
      filePath,
      deleted: true
    };
  }

  private parseCSV(content: string): any[] {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      return obj;
    });
  }

  private formatCSV(data: any[]): string {
    if (!Array.isArray(data) || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvLines = [headers.join(',')];
    
    data.forEach(row => {
      const values = headers.map(header => String(row[header] || ''));
      csvLines.push(values.join(','));
    });
    
    return csvLines.join('\n');
  }
}