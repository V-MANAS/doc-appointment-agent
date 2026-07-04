import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import AppointmentsService from './services';
import SchedulingService from '../scheduling/service';

const createAppointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  doctorId: z.string().optional(),
  whatsappNumber: z.string().min(10, 'WhatsApp number is too short'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  paymentMethod: z.enum(['STRIPE', 'CASH']),
});

const rescheduleSchema = z.object({
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  newTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
});

export class AppointmentsController {
  public static async getAppointments(req: Request, res: Response, next: NextFunction) {
    try {
      const whatsappNumber = req.query.whatsappNumber as string;
      
      let appointments;
      if (whatsappNumber) {
        appointments = await AppointmentsService.getAppointmentsByUser(whatsappNumber);
      } else {
        // Only Admin or Doctor can retrieve all appointments
        const user = (req as any).user;
        if (user && (user.role === 'ADMIN' || user.role === 'DOCTOR')) {
          appointments = await AppointmentsService.getAllAppointments();
        } else {
          return res.status(403).json({ success: false, message: 'Forbidden. Permissions required.' });
        }
      }

      res.status(200).json({ success: true, appointments });
    } catch (error) {
      next(error);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createAppointmentSchema.parse(req.body);
      const appointment = await AppointmentsService.createAppointment(validatedData);

      let paymentLink = null;
      if (validatedData.paymentMethod === 'STRIPE') {
        paymentLink = `http://localhost:5000/api/v1/payments/checkout-session?appointmentId=${appointment.id}`;
      }

      res.status(201).json({
        success: true,
        message: 'Appointment booked successfully.',
        appointment,
        paymentLink,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async reschedule(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedData = rescheduleSchema.parse(req.body);
      
      const appointment = await AppointmentsService.rescheduleAppointment(
        id,
        validatedData.newDate,
        validatedData.newTime
      );

      res.status(200).json({
        success: true,
        message: 'Appointment rescheduled successfully.',
        appointment,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await AppointmentsService.cancelAppointment(id);

      res.status(200).json({
        success: true,
        message: 'Appointment cancelled successfully.',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getSlots(req: Request, res: Response, next: NextFunction) {
    try {
      const { doctorId, date } = req.query as { doctorId: string; date: string };
      if (!doctorId || !date) {
        return res.status(400).json({ success: false, message: 'doctorId and date are required' });
      }

      const slots = await SchedulingService.getAvailableSlots(doctorId, date);
      res.status(200).json({ success: true, date, slots });
    } catch (error) {
      next(error);
    }
  }
}
export default AppointmentsController;
