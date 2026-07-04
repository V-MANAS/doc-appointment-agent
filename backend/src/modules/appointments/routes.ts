import { Router } from 'express';
import AppointmentsController from './controllers';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

// Public helper route (authenticated user can retrieve slot list)
router.get('/slots', authenticateJwt, AppointmentsController.getSlots);

// Core endpoints
router.get('/', authenticateJwt, AppointmentsController.getAppointments);
router.post('/', authenticateJwt, AppointmentsController.create);
router.put('/:id/reschedule', authenticateJwt, AppointmentsController.reschedule);
router.put('/:id/cancel', authenticateJwt, AppointmentsController.cancel);

export default router;
