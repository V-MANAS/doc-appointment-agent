import prisma from '../../infrastructure/database';
import ToolRegistry, { ToolDeclaration } from '../../ai/tools/ToolRegistry';
import SchedulingService from '../scheduling/service';
import logger from '../../logger';
import { broadcastEvent } from '../../infrastructure/websocket';

export class AppointmentsService {
  /**
   * Retrieves future appointments for a user by WhatsApp number.
   */
  public static async getAppointmentsByUser(whatsappNumber: string) {
    return await prisma.appointment.findMany({
      where: { whatsappNumber },
      include: { patient: true, doctor: true },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
  }

  /**
   * Retrieves all appointments (useful for global schedules or slot search).
   */
  public static async getAllAppointments() {
    return await prisma.appointment.findMany({
      include: { patient: true, doctor: true },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
  }

  /**
   * Books a new appointment with slot checking.
   */
  public static async createAppointment(data: {
    patientId: string;
    doctorId?: string;
    whatsappNumber: string;
    date: string;
    time: string;
    paymentMethod: 'STRIPE' | 'CASH';
  }) {
    // 1. Resolve Doctor ID (default to first doctor if unspecified)
    let doctorId = data.doctorId;
    if (!doctorId) {
      const firstDoc = await prisma.doctor.findFirst();
      if (!firstDoc) {
        throw new Error('No doctors exist in database. Cannot book appointment.');
      }
      doctorId = firstDoc.id;
    }

    // 2. Validate Slot Availability
    const isAvailable = await SchedulingService.isSlotAvailable(doctorId, data.date, data.time);
    if (!isAvailable) {
      throw new Error(`The selected slot ${data.time} on ${data.date} is not available.`);
    }

    // 3. Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        patientId: data.patientId,
        doctorId,
        whatsappNumber: data.whatsappNumber,
        date: data.date,
        time: data.time,
        paymentMethod: data.paymentMethod,
        paymentStatus: 'PENDING',
        status: 'CONFIRMED',
      },
      include: { patient: true, doctor: true },
    });

    logger.info(`Appointment booked successfully: ${appointment.id}`);

    // Real-time synchronization
    broadcastEvent('dashboard:update', { type: 'APPOINTMENT_CREATED', appointment });
    broadcastEvent('sheet:sync', { sheet: 'Appointments', action: 'INSERT', data: appointment });

    return appointment;
  }

  /**
   * Reschedules an existing appointment.
   */
  public static async rescheduleAppointment(appointmentId: string, date: string, time: string) {
    const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt) {
      throw new Error(`Appointment with ID ${appointmentId} not found`);
    }

    // Check availability on the new date/time
    const isAvailable = await SchedulingService.isSlotAvailable(appt.doctorId, date, time);
    if (!isAvailable) {
      throw new Error(`The selected slot ${time} on ${date} is not available.`);
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { date, time },
      include: { patient: true, doctor: true },
    });

    logger.info(`Appointment rescheduled: ${appointmentId} to ${date} ${time}`);
    
    // Real-time sync
    broadcastEvent('dashboard:update', { type: 'APPOINTMENT_RESCHEDULED', appointment: updated });
    broadcastEvent('sheet:sync', { sheet: 'Appointments', action: 'UPDATE', data: updated });

    return updated;
  }

  /**
   * Cancels an appointment and handles Stripe refunds.
   */
  public static async cancelAppointment(appointmentId: string) {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { payment: true },
    });

    if (!appt) {
      throw new Error(`Appointment with ID ${appointmentId} not found`);
    }

    // Update status
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED' },
      include: { patient: true, doctor: true },
    });

    let refundInitiated = false;

    // Check refund: if Stripe and Paid
    if (appt.paymentMethod === 'STRIPE' && appt.paymentStatus === 'PAID') {
      logger.info(`Initiating mock Stripe refund for cancelled appointment: ${appt.id}`);
      
      // Update payment model
      await prisma.payment.updateMany({
        where: { appointmentId },
        data: { status: 'REFUNDED', refundId: `ref_${Date.now()}` },
      });

      // Update appointment paymentStatus
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { paymentStatus: 'REFUNDED' },
      });

      updated.paymentStatus = 'REFUNDED';
      refundInitiated = true;
    }

    logger.info(`Appointment cancelled: ${appointmentId}`);

    // Real-time sync
    broadcastEvent('dashboard:update', { type: 'APPOINTMENT_CANCELLED', appointment: updated, refundInitiated });
    broadcastEvent('sheet:sync', { sheet: 'Appointments', action: 'UPDATE', data: updated });

    return { appointment: updated, refundInitiated };
  }

  /**
   * Registration of Agent Tools for Appointments
   */
  public static registerAgentTools() {
    const registry = ToolRegistry.getInstance();

    // 1. Tool Declaration: get_user_appointments
    const getUserApptsSchema: ToolDeclaration = {
      name: 'get_user_appointments',
      description: 'Get all scheduled and history appointments for a WhatsApp number.',
      parameters: {
        type: 'OBJECT',
        properties: {
          whatsapp_number: {
            type: 'STRING',
            description: "The patient's WhatsApp/phone number.",
          },
        },
        required: ['whatsapp_number'],
      },
    };

    registry.registerTool(getUserApptsSchema, async (args: any) => {
      const { whatsapp_number } = args;
      return await this.getAppointmentsByUser(whatsapp_number);
    });

    // 2. Tool Declaration: get_all_appointments
    const getAllApptsSchema: ToolDeclaration = {
      name: 'get_all_appointments',
      description: 'Retrieve all clinic appointments. Used to see existing booked timings to check for schedule overlaps.',
      parameters: { type: 'OBJECT', properties: {} },
    };

    registry.registerTool(getAllApptsSchema, async () => {
      return await this.getAllAppointments();
    });

    // 3. Tool Declaration: add_appointment
    const addApptSchema: ToolDeclaration = {
      name: 'add_appointment',
      description: 'Book and schedule a new doctor appointment for a patient.',
      parameters: {
        type: 'OBJECT',
        properties: {
          patient_id: { type: 'STRING', description: 'The unique patient registration ID.' },
          whatsapp_number: { type: 'STRING', description: "The parent's WhatsApp number." },
          date: { type: 'STRING', description: 'The scheduled booking date (YYYY-MM-DD).' },
          time: { type: 'STRING', description: 'The scheduled booking time slot (HH:MM).' },
          payment_method: { type: 'STRING', description: 'Payment method choice: STRIPE or CASH.' },
          doctor_id: { type: 'STRING', description: 'Optional doctor ID. Defaults to first doctor if omitted.' },
        },
        required: ['patient_id', 'whatsapp_number', 'date', 'time', 'payment_method'],
      },
    };

    registry.registerTool(addApptSchema, async (args: any) => {
      const { patient_id, whatsapp_number, date, time, payment_method, doctor_id } = args;
      return await this.createAppointment({
        patientId: patient_id,
        whatsappNumber: whatsapp_number,
        date,
        time,
        paymentMethod: payment_method === 'STRIPE' ? 'STRIPE' : 'CASH',
        doctorId: doctor_id || undefined,
      });
    });

    // 4. Tool Declaration: reschedule_appointment
    const rescheduleSchema: ToolDeclaration = {
      name: 'reschedule_appointment',
      description: 'Reschedule an existing confirmed appointment to a new date and time.',
      parameters: {
        type: 'OBJECT',
        properties: {
          appointment_id: { type: 'STRING', description: 'The ID of the appointment to reschedule.' },
          date: { type: 'STRING', description: 'The new booking date (YYYY-MM-DD).' },
          time: { type: 'STRING', description: 'The new booking time slot (HH:MM).' },
        },
        required: ['appointment_id', 'date', 'time'],
      },
    };

    registry.registerTool(rescheduleSchema, async (args: any) => {
      const { appointment_id, date, time } = args;
      return await this.rescheduleAppointment(appointment_id, date, time);
    });

    // 5. Tool Declaration: cancel_appointment
    const cancelSchema: ToolDeclaration = {
      name: 'cancel_appointment',
      description: 'Cancel an existing confirmed doctor appointment.',
      parameters: {
        type: 'OBJECT',
        properties: {
          appointment_id: { type: 'STRING', description: 'The ID of the appointment to cancel.' },
        },
        required: ['appointment_id'],
      },
    };

    registry.registerTool(cancelSchema, async (args: any) => {
      const { appointment_id } = args;
      return await this.cancelAppointment(appointment_id);
    });
  }
}

// Evaluate file registers tools automatically
AppointmentsService.registerAgentTools();

export default AppointmentsService;
