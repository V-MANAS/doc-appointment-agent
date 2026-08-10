import { Router } from 'express';
import AdminController from './controllers';
import { authenticateJwt, authorizeRoles } from '../../middleware/auth';

const router = Router();

// Apply auth protection and role gate to all admin sub-routes
router.use(authenticateJwt, authorizeRoles('ADMIN', 'DOCTOR'));

router.get('/patients', AdminController.getPatients);
router.get('/appointments', AdminController.getAppointments);
router.get('/config', AdminController.getConfig);

export default router;
