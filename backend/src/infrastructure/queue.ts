import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../logger';
import { env } from '../config/env';

type JobHandler = (data: any) => Promise<void>;

const jobHandlers: Record<string, JobHandler> = {};
const simulatedQueue: { queueName: string; jobName: string; data: any }[] = [];

// Registry for worker job handlers
export const registerJobHandler = (jobName: string, handler: JobHandler) => {
  jobHandlers[jobName] = handler;
  logger.info(`📋 Job handler registered for: ${jobName}`);
};

let redisConnection: IORedis | null = null;
const bullQueues: Record<string, Queue> = {};

// Initialize job queues
export const initQueues = async (): Promise<void> => {
  if (env.USE_SIMULATED_REDIS) {
    logger.warn('⚠️ BullMQ: Running in SIMULATED (In-Memory) mode. No Redis required.');
    startSimulatedWorker();
    return;
  }

  try {
    redisConnection = new IORedis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      maxRetriesPerRequest: null,
    });

    redisConnection.on('error', (err) => {
      logger.error('❌ Redis connection error:', err);
      fallbackToSimulated();
    });

    redisConnection.on('connect', () => {
      logger.info('🔑 Redis connection established for BullMQ');
    });

    // We initialize standard queues
    const queueNames = ['reminders', 'notifications', 'payments'];
    for (const name of queueNames) {
      bullQueues[name] = new Queue(name, { connection: redisConnection as any });
      
      // Spawn BullMQ Workers to match
      new Worker(name, async (job: Job) => {
        const handler = jobHandlers[job.name];
        if (handler) {
          logger.info(`⚙️ BullMQ: Processing job [${job.name}] on queue [${name}]`);
          await handler(job.data);
        } else {
          logger.warn(`⚠️ BullMQ: No handler found for job [${job.name}]`);
        }
      }, { connection: redisConnection as any });
    }
  } catch (error) {
    logger.error('❌ Failed to initialize Redis-backed queues, falling back to simulated:', error);
    fallbackToSimulated();
  }
};

const fallbackToSimulated = () => {
  (env as any).USE_SIMULATED_REDIS = true;
  logger.warn('⚠️ Fallback initiated: Switched to SIMULATED (In-Memory) Queue Manager.');
  startSimulatedWorker();
};

// Simulated In-Memory Worker
let simulatedWorkerInterval: NodeJS.Timeout | null = null;

const startSimulatedWorker = () => {
  if (simulatedWorkerInterval) return;

  simulatedWorkerInterval = setInterval(async () => {
    if (simulatedQueue.length === 0) return;

    const job = simulatedQueue.shift();
    if (!job) return;

    const handler = jobHandlers[job.jobName];
    if (handler) {
      try {
        logger.info(`⚙️ Simulated Queue: Processing job [${job.jobName}] on [${job.queueName}]`);
        await handler(job.data);
      } catch (err) {
        logger.error(`❌ Simulated Queue: Job [${job.jobName}] execution failed:`, err);
      }
    } else {
      logger.warn(`⚠️ Simulated Queue: No handler registered for job [${job.jobName}]`);
    }
  }, 1000); // Poll in-memory queue every second
};

// Main entrypoint to enqueue jobs
export const addJob = async (queueName: string, jobName: string, data: any): Promise<void> => {
  if (env.USE_SIMULATED_REDIS || !bullQueues[queueName]) {
    logger.info(`📥 Simulated Queue: Job [${jobName}] pushed to queue [${queueName}]`);
    simulatedQueue.push({ queueName, jobName, data });
    return;
  }

  try {
    const queue = bullQueues[queueName];
    await queue.add(jobName, data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    logger.info(`📥 BullMQ: Job [${jobName}] successfully pushed to Redis queue [${queueName}]`);
  } catch (error) {
    logger.error(`❌ BullMQ: Failed pushing job [${jobName}] to Redis. Redirecting to in-memory fallback.`, error);
    simulatedQueue.push({ queueName, jobName, data });
  }
};
export default { addJob, registerJobHandler, initQueues };
