import prisma from '../../infrastructure/database';
import logger from '../../logger';
import { broadcastEvent } from '../../infrastructure/websocket';

export class PaymentsService {
  /**
   * Processes a successful mock Stripe payment transaction.
   */
  public static async processPaymentSuccess(appointmentId: string, paymentIntentId: string) {
    logger.info(`Processing payment success for appointment: ${appointmentId} | Intent: ${paymentIntentId}`);

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new Error(`Appointment with ID ${appointmentId} not found`);
    }

    // 1. Update appointment payment status to PAID
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        paymentStatus: 'PAID',
        stripePaymentIntent: paymentIntentId,
      },
      include: { patient: true, doctor: true },
    });

    // 2. Upsert Payment registry row
    const payment = await prisma.payment.upsert({
      where: { appointmentId },
      update: {
        status: 'PAID',
        stripeSessionId: paymentIntentId,
      },
      create: {
        appointmentId,
        amount: 5000, // $50.00 represented in cents
        currency: 'usd',
        status: 'PAID',
        method: 'STRIPE',
        stripeSessionId: paymentIntentId,
      },
    });

    // 3. Log transaction audit trail
    await prisma.auditLog.create({
      data: {
        action: 'PAYMENT_SUCCESS',
        details: JSON.stringify({ appointmentId, paymentId: payment.id, paymentIntentId }),
      },
    });

    logger.info(`Stripe payment complete for appointment ${appointmentId}. Payment ID: ${payment.id}`);

    // 4. Real-time broadcast
    broadcastEvent('dashboard:update', { type: 'PAYMENT_COMPLETED', appointment: updatedAppointment, payment });
    broadcastEvent('sheet:sync', { sheet: 'Appointments', action: 'UPDATE', data: updatedAppointment });

    return { appointment: updatedAppointment, payment };
  }
}
export default PaymentsService;
