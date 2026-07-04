import { Router } from 'express';
import PaymentsController from './controllers';

const router = Router();

// Express endpoints for payment redirections & webhooks
router.get('/checkout-session', PaymentsController.checkoutSession);
router.post('/webhook', PaymentsController.webhook);

export default router;
