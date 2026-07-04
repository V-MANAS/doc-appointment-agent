import { Request, Response, NextFunction } from 'express';
import PaymentsService from './services';
import logger from '../../logger';

export class PaymentsController {
  /**
   * Mock Stripe checkout session creation.
   * Redirects the user's browser to the React dashboard's checkout simulator.
   */
  public static async checkoutSession(req: Request, res: Response, next: NextFunction) {
    try {
      const appointmentId = req.query.appointmentId as string;
      if (!appointmentId) {
        return res.status(400).json({ success: false, message: 'appointmentId query parameter is required' });
      }

      // In production, this would communicate with Stripe API.
      // In our mock setup, we redirect the patient directly to the React frontend mock payment page
      const clientUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
      const redirectUrl = `${clientUrl}/mock-checkout?appointmentId=${appointmentId}`;
      
      logger.info(`Redirecting user to mock payment link: ${redirectUrl}`);
      res.redirect(redirectUrl);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Receives checkout callback events from our mock Stripe interface.
   */
  public static async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, data } = req.body;

      if (type !== 'payment_intent.succeeded') {
        logger.warn(`Stripe Webhook: Received unhandled event type: ${type}`);
        return res.status(200).json({ received: true, message: 'Unhandled event' });
      }

      const paymentIntent = data.object;
      const appointmentId = paymentIntent.metadata?.appointmentId;

      if (!appointmentId) {
        logger.error('Stripe Webhook: Missing appointmentId in payment metadata.');
        return res.status(400).json({ success: false, message: 'Missing appointmentId metadata' });
      }

      const result = await PaymentsService.processPaymentSuccess(appointmentId, paymentIntent.id);
      
      res.status(200).json({
        success: true,
        received: true,
        message: 'Mock payment processed successfully.',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}
export default PaymentsController;
