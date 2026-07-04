import ToolRegistry from './ToolRegistry';
import logger from '../../logger';

export const executeTool = async (name: string, args: any): Promise<any> => {
  const registry = ToolRegistry.getInstance();
  logger.info(`AI Tool Executor: Running tool [${name}]`);
  return await registry.executeTool(name, args);
};

export default { executeTool };
