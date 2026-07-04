import { Router } from 'express';
import PatientsController from './controllers';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

// Protect patients list with auth
router.use(authenticateJwt);

router.get('/', PatientsController.getPatients);
router.post('/register', PatientsController.registerPatient);

export default router;
