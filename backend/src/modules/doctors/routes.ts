import { Router } from 'express';
import DoctorsController from './controllers';
import { authenticateJwt, authorizeRoles } from '../../middleware/auth';

const router = Router();

// Public routes (authenticated patients can view doctor lists)
router.get('/', authenticateJwt, DoctorsController.getDoctors);

// Private routes (limited to Doctors or Administrators)
router.use(authenticateJwt, authorizeRoles('DOCTOR', 'ADMIN'));
router.put('/:id/settings', DoctorsController.updateSettings);
router.post('/:id/leave', DoctorsController.addLeave);
router.delete('/:id/leave', DoctorsController.removeLeave);
router.post('/:id/block', DoctorsController.blockTimeSlot);
router.post('/holidays', DoctorsController.addHoliday);

export default router;
