import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './shared/errors';
import logger from './logger';

// We will import feature routers here as we implement them
import authRouter from './modules/auth/routes';
import appointmentsRouter from './modules/appointments/routes';
import patientsRouter from './modules/patients/routes';
import doctorsRouter from './modules/doctors/routes';
import paymentsRouter from './modules/payments/routes';
import chatRouter from './modules/chat/routes';
import analyticsRouter from './modules/analytics/routes';
import adminRouter from './modules/admin/routes';
import consultationsRouter from './modules/consultations/routes';

const app = express();

// Security Headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Request Logger
app.use((req, res, next) => {
  logger.info(`HTTP Request: ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Health Check API
app.get('/api/v1/health', async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// API version 1 Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/appointments', appointmentsRouter);
app.use('/api/v1/patients', patientsRouter);
app.use('/api/v1/doctors', doctorsRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/chat', chatRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/consultation', consultationsRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
