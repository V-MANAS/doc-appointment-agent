import prisma from '../../infrastructure/database';
import logger from '../../logger';

export interface TimeSlot {
  time: string; // HH:MM
  available: boolean;
}

export class SchedulingService {
  /**
   * Helper: Converts "HH:MM" string to minutes from midnight
   */
  private static timeToMinutes(timeStr: string): number {
    const [hrs, mins] = timeStr.split(':').map(Number);
    return hrs * 60 + mins;
  }

  /**
   * Helper: Converts minutes from midnight to "HH:MM"
   */
  private static minutesToTime(minutes: number): string {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * Fetches available slots for a given doctor on a specific date.
   */
  public static async getAvailableSlots(doctorId: string, date: string): Promise<string[]> {
    try {
      // 1. Fetch Doctor details
      const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
      if (!doctor) {
        throw new Error(`Doctor with ID ${doctorId} not found`);
      }

      // 2. Fetch leaves, holidays, and blocked slots from Config table
      const leavesJson = await prisma.config.findUnique({ where: { key: `doctor_leaves_${doctorId}` } });
      const blockedJson = await prisma.config.findUnique({ where: { key: `doctor_blocked_slots_${doctorId}` } });
      const holidaysJson = await prisma.config.findUnique({ where: { key: 'clinic_holidays' } });

      const leaves: string[] = leavesJson ? JSON.parse(leavesJson.value) : [];
      const blockedSlots: string[] = blockedJson ? JSON.parse(blockedJson.value) : []; // Array of "YYYY-MM-DD HH:MM"
      const holidays: string[] = holidaysJson ? JSON.parse(holidaysJson.value) : []; // E.g. ["Saturday", "Sunday"] or specific dates

      // Check if date is a doctor leave day
      if (leaves.includes(date)) {
        logger.info(`Date ${date} is a leave day for Doctor ${doctor.name}`);
        return [];
      }

      // Check if date is a holiday (date or weekday name match)
      const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' });
      if (holidays.includes(date) || holidays.includes(dayOfWeek)) {
        logger.info(`Date ${date} is a holiday (${dayOfWeek})`);
        return [];
      }

      // 3. Fetch existing confirmed bookings
      const bookings = await prisma.appointment.findMany({
        where: {
          doctorId,
          date,
          status: 'CONFIRMED',
        },
      });

      // Check daily appointment limit cap
      if (bookings.length >= doctor.maxDailyBookings) {
        logger.warn(`Doctor ${doctor.name} has reached maximum daily appointment limit on ${date}`);
        return [];
      }

      // 4. Generate all slots in working hours range
      const [workStartStr, workEndStr] = doctor.workingHours.split('-');
      const [lunchStartStr, lunchEndStr] = doctor.lunchBreak.split('-');

      const startMin = this.timeToMinutes(workStartStr);
      const endMin = this.timeToMinutes(workEndStr);
      const lunchStartMin = this.timeToMinutes(lunchStartStr);
      const lunchEndMin = this.timeToMinutes(lunchEndStr);

      const slotDuration = 30; // 30 minutes
      const bufferDuration = 10; // 10 minutes buffer time

      const availableSlots: string[] = [];
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata', hour12: false };
      const todayStr = now.toLocaleDateString('en-CA', options); // YYYY-MM-DD
      const currentMin = now.getHours() * 60 + now.getMinutes();

      for (let timeMin = startMin; timeMin + slotDuration <= endMin; timeMin += slotDuration) {
        const slotStart = timeMin;
        const slotEnd = timeMin + slotDuration;
        const slotTimeStr = this.minutesToTime(slotStart);

        // A. Filter past times if date is today
        if (date === todayStr && slotStart <= currentMin + 30) {
          continue; // Slot is in the past or starts too soon
        }

        // B. Exclude lunch hours
        // Checks if slot overlaps with lunch break [lunchStartMin, lunchEndMin]
        if (slotStart < lunchEndMin && slotEnd > lunchStartMin) {
          continue; // Overlaps with lunch
        }

        // C. Exclude specific blocked slot date/time
        if (blockedSlots.includes(`${date} ${slotTimeStr}`)) {
          continue; // Manual slot block
        }

        // D. Double-booking & Buffer check against existing appointments
        let hasOverlap = false;
        for (const booking of bookings) {
          const bookingStart = this.timeToMinutes(booking.time);
          const bookingEnd = bookingStart + slotDuration;

          // Enforce 10-minute buffer: Busy range is [bookingStart - buffer, bookingEnd + buffer]
          const busyStart = bookingStart - bufferDuration;
          const busyEnd = bookingEnd + bufferDuration;

          // Check interval intersection
          if (slotStart < busyEnd && slotEnd > busyStart) {
            hasOverlap = true;
            break;
          }
        }

        if (!hasOverlap) {
          availableSlots.push(slotTimeStr);
        }
      }

      return availableSlots;
    } catch (error) {
      logger.error(`Error calculating slots for Doctor ${doctorId} on ${date}:`, error);
      return [];
    }
  }

  /**
   * Atomic check to see if a specific slot is available.
   */
  public static async isSlotAvailable(doctorId: string, date: string, time: string): Promise<boolean> {
    const slots = await this.getAvailableSlots(doctorId, date);
    return slots.includes(time);
  }
}
export default SchedulingService;
