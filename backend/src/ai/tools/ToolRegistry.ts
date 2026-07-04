import logger from '../../logger';

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

type ToolHandler = (args: any) => Promise<any>;

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, { declaration: ToolDeclaration; handler: ToolHandler }> = new Map();

  private constructor() {}

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  public registerTool(declaration: ToolDeclaration, handler: ToolHandler) {
    this.tools.set(declaration.name, { declaration, handler });
    logger.info(`🛠️ Tool Registered: ${declaration.name}`);
  }

  public getDeclarations(): ToolDeclaration[] {
    return Array.from(this.tools.values()).map((t) => t.declaration);
  }

  public async executeTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      logger.error(`❌ Tool execution failed: Tool [${name}] not found in Registry.`);
      throw new Error(`Tool [${name}] is not registered`);
    }

    try {
      logger.info(`⚙️ Executing AI Tool [${name}] with args: ${JSON.stringify(args)}`);
      const result = await tool.handler(args);
      logger.debug(`🛠️ Tool [${name}] result: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      logger.error(`❌ Error executing tool [${name}]:`, error);
      return { success: false, error: error.message || 'Tool execution error' };
    }
  }
}
export default ToolRegistry;
