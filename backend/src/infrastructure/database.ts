import { PrismaClient } from '@prisma/client';
import logger from '../logger';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
  ],
});

// Cast prisma as any to listen to events dynamically
(prisma as any).$on('query', (e: any) => {
  logger.debug(`Prisma Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
});

export const connectDb = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('🔑 Database connected successfully via Prisma Client');
  } catch (error) {
    logger.error('❌ Database connection failure:', error);
    process.exit(1);
  }
};
export default prisma;
