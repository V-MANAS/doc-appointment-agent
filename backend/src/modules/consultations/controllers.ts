import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../infrastructure/database';
import { broadcastEvent } from '../../infrastructure/websocket';
import logger from '../../logger';

// Validation schemas
const startSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
});

const completeSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
});

const noShowSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
});

const cancelSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
});

const notesSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
  chiefComplaint: z.string().default(''),
  diagnosis: z.string().default(''),
  doctorNotes: z.string().default(''),
  followUpDate: z.string().optional().nullable(),
});

const medicineItemSchema = z.object({
  medicineName: z.string().min(1, 'Medicine name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  duration: z.string().min(1, 'Duration is required'),
  instructions: z.string().default(''),
});

const prescriptionSchema = z.object({
  consultationId: z.string().min(1, 'Consultation ID is required'),
  medicines: z.array(medicineItemSchema),
});

export class ConsultationsController {
  /**
   * Start a patient consultation (Changes status to IN_PROGRESS)
   */
  public static async startConsultation(req: Request, res: Response, next: NextFunction) {
    try {
      const { appointmentId } = startSchema.parse(req.body);

      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appt) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }

      // Update status to IN_PROGRESS
      const updated = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'IN_PROGRESS' },
        include: { patient: true, doctor: true },
      });

      // Upsert/Create Consultation record
      let consultation = await prisma.consultation.findUnique({
        where: { appointmentId },
      });

      if (!consultation) {
        consultation = await prisma.consultation.create({
          data: {
            appointmentId,
            doctorId: updated.doctorId,
            patientId: updated.patientId,
            chiefComplaint: '',
            diagnosis: '',
            doctorNotes: '',
            followUpDate: null,
          },
        });
      }

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: (req as any).user?.id || null,
          action: 'Doctor started consultation',
          details: JSON.stringify({ appointmentId, consultationId: consultation.id }),
          ipAddress: req.ip,
        },
      });

      // WS Broadcasts
      broadcastEvent('consultation_started', { appointment: updated, consultation });
      broadcastEvent('appointment_updated', { appointment: updated });
      broadcastEvent('dashboard:update', { type: 'APPOINTMENT_UPDATED', appointment: updated });
      broadcastEvent('sheet:sync', { sheet: 'Appointments', action: 'UPDATE', data: updated });

      res.status(200).json({ success: true, appointment: updated, consultation });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete a patient consultation (Changes status to COMPLETED)
   */
  public static async completeConsultation(req: Request, res: Response, next: NextFunction) {
    try {
      const { appointmentId } = completeSchema.parse(req.body);

      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appt) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }

      // Update status to COMPLETED
      const updated = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'COMPLETED' },
        include: { patient: true, doctor: true },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: (req as any).user?.id || null,
          action: 'Doctor completed consultation',
          details: JSON.stringify({ appointmentId }),
          ipAddress: req.ip,
        },
      });

      // WS Broadcasts
      broadcastEvent('consultation_completed', { appointment: updated });
      broadcastEvent('appointment_updated', { appointment: updated });
      broadcastEvent('dashboard:update', { type: 'APPOINTMENT_UPDATED', appointment: updated });
      broadcastEvent('sheet:sync', { sheet: 'Appointments', action: 'UPDATE', data: updated });

      res.status(200).json({ success: true, appointment: updated });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark a patient as no-show
   */
  public static async noShow(req: Request, res: Response, next: NextFunction) {
    try {
      const { appointmentId } = noShowSchema.parse(req.body);

      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appt) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }

      // Update status to NO_SHOW
      const updated = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'NO_SHOW' },
        include: { patient: true, doctor: true },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: (req as any).user?.id || null,
          action: 'Patient no show',
          details: JSON.stringify({ appointmentId }),
          ipAddress: req.ip,
        },
      });

      // WS Broadcasts
      broadcastEvent('appointment_updated', { appointment: updated });
      broadcastEvent('dashboard:update', { type: 'APPOINTMENT_UPDATED', appointment: updated });
      broadcastEvent('sheet:sync', { sheet: 'Appointments', action: 'UPDATE', data: updated });

      res.status(200).json({ success: true, appointment: updated });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel an appointment (re-routing for dashboard workflow)
   */
  public static async cancelAppointment(req: Request, res: Response, next: NextFunction) {
    try {
      const { appointmentId } = cancelSchema.parse(req.body);

      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appt) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }

      // Update status to CANCELLED
      const updated = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELLED' },
        include: { patient: true, doctor: true },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: (req as any).user?.id || null,
          action: 'Clinic cancelled appointment',
          details: JSON.stringify({ appointmentId }),
          ipAddress: req.ip,
        },
      });

      // WS Broadcasts
      broadcastEvent('appointment_updated', { appointment: updated });
      broadcastEvent('dashboard:update', { type: 'APPOINTMENT_UPDATED', appointment: updated });
      broadcastEvent('sheet:sync', { sheet: 'Appointments', action: 'UPDATE', data: updated });

      res.status(200).json({ success: true, appointment: updated });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add or update consultation notes
   */
  public static async saveNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const { appointmentId, chiefComplaint, diagnosis, doctorNotes, followUpDate } = notesSchema.parse(req.body);

      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appt) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }

      const consultation = await prisma.consultation.upsert({
        where: { appointmentId },
        update: {
          chiefComplaint,
          diagnosis,
          doctorNotes,
          followUpDate: followUpDate || null,
        },
        create: {
          appointmentId,
          doctorId: appt.doctorId,
          patientId: appt.patientId,
          chiefComplaint,
          diagnosis,
          doctorNotes,
          followUpDate: followUpDate || null,
        },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: (req as any).user?.id || null,
          action: 'Notes added',
          details: JSON.stringify({ appointmentId, consultationId: consultation.id }),
          ipAddress: req.ip,
        },
      });

      broadcastEvent('sheet:sync', { sheet: 'Consultations', action: 'UPDATE', data: consultation });

      res.status(200).json({ success: true, consultation });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add or update prescriptions list
   */
  public static async savePrescription(req: Request, res: Response, next: NextFunction) {
    try {
      const { consultationId, medicines } = prescriptionSchema.parse(req.body);

      const consultation = await prisma.consultation.findUnique({
        where: { id: consultationId },
      });

      if (!consultation) {
        return res.status(404).json({ success: false, message: 'Consultation not found' });
      }

      // Delete existing prescriptions
      await prisma.prescription.deleteMany({
        where: { consultationId },
      });

      // Create new list
      const created = await Promise.all(
        medicines.map((m) =>
          prisma.prescription.create({
            data: {
              consultationId,
              medicineName: m.medicineName,
              dosage: m.dosage,
              frequency: m.frequency,
              duration: m.duration,
              instructions: m.instructions,
            },
          })
        )
      );

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: (req as any).user?.id || null,
          action: 'Prescription generated',
          details: JSON.stringify({ consultationId, count: created.length }),
          ipAddress: req.ip,
        },
      });

      // WS Broadcasts
      broadcastEvent('prescription_generated', { consultationId, prescriptions: created });

      res.status(200).json({ success: true, prescriptions: created });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get consultation details by Appointment ID
   */
  public static async getConsultation(req: Request, res: Response, next: NextFunction) {
    try {
      const { appointmentId } = req.params;

      const consultation = await prisma.consultation.findUnique({
        where: { appointmentId },
        include: { prescriptions: true },
      });

      res.status(200).json({ success: true, consultation });
    } catch (error) {
      next(error);
    }
  }
}
export default ConsultationsController;
