import { Router } from 'express';
import ChatController from './controllers';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

// Protect conversation endpoints
router.post('/', authenticateJwt, ChatController.sendMessage);
router.get('/history', authenticateJwt, ChatController.getHistory);

export default router;
