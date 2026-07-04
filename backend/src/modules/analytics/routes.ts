import { Router } from 'express';
import AnalyticsController from './controllers';
import { authenticateJwt, authorizeRoles } from '../../middleware/auth';

const router = Router();

// Restrict analytics dashboard endpoints to ADMIN and DOCTOR accounts
router.get('/', authenticateJwt, authorizeRoles('ADMIN', 'DOCTOR'), AnalyticsController.getStats);

export default router;
