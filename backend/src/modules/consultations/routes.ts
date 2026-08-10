import { Router } from 'express';
import ConsultationsController from './controllers';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

// Apply JWT auth protection to all consultation API routes
router.use(authenticateJwt);

router.post('/start', ConsultationsController.startConsultation);
router.post('/complete', ConsultationsController.completeConsultation);
router.post('/no-show', ConsultationsController.noShow);
router.post('/cancel', ConsultationsController.cancelAppointment);
router.post('/notes', ConsultationsController.saveNotes);
router.post('/prescription', ConsultationsController.savePrescription);
router.get('/:appointmentId', ConsultationsController.getConsultation);

export default router;
