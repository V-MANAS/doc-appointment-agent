import prisma from '../../infrastructure/database';
import logger from '../../logger';
import { broadcastEvent } from '../../infrastructure/websocket';

export class DoctorsService {
  /**
   * Fetch all doctors.
   */
  public static async getAllDoctors() {
    return await prisma.doctor.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Updates doctor settings.
   */
  public static async updateDoctorSettings(
    doctorId: string,
    data: { workingHours?: string; lunchBreak?: string; maxDailyBookings?: number }
  ) {
    const updated = await prisma.doctor.update({
      where: { id: doctorId },
      data: {
        workingHours: data.workingHours,
        lunchBreak: data.lunchBreak,
        maxDailyBookings: data.maxDailyBookings,
      },
    });

    logger.info(`Doctor settings updated for: ${updated.name}`);
    broadcastEvent('dashboard:update', { type: 'DOCTOR_SETTINGS_UPDATED', doctor: updated });
    broadcastEvent('sheet:sync', { sheet: 'Config', action: 'UPDATE', data: updated });

    return updated;
  }

  /**
   * Adds a doctor leave date (Stored as JSON array in Config model).
   */
  public static async addDoctorLeave(doctorId: string, date: string) {
    const configKey = `doctor_leaves_${doctorId}`;
    
    const existingConfig = await prisma.config.findUnique({ where: { key: configKey } });
    const leaves: string[] = existingConfig ? JSON.parse(existingConfig.value) : [];

    if (!leaves.includes(date)) {
      leaves.push(date);
      await prisma.config.upsert({
        where: { key: configKey },
        update: { value: JSON.stringify(leaves) },
        create: { key: configKey, value: JSON.stringify(leaves) },
      });
      logger.info(`Registered leave on ${date} for doctor: ${doctorId}`);
    }

    broadcastEvent('dashboard:update', { type: 'DOCTOR_LEAVE_ADDED', doctorId, date });
    return leaves;
  }

  /**
   * Removes a doctor leave date.
   */
  public static async removeDoctorLeave(doctorId: string, date: string) {
    const configKey = `doctor_leaves_${doctorId}`;
    const existingConfig = await prisma.config.findUnique({ where: { key: configKey } });
    if (!existingConfig) return [];

    let leaves: string[] = JSON.parse(existingConfig.value);
    leaves = leaves.filter((d) => d !== date);

    await prisma.config.update({
      where: { key: configKey },
      data: { value: JSON.stringify(leaves) },
    });

    logger.info(`Removed leave on ${date} for doctor: ${doctorId}`);
    broadcastEvent('dashboard:update', { type: 'DOCTOR_LEAVE_REMOVED', doctorId, date });
    return leaves;
  }

  /**
   * Blocks a specific slot (date + time).
   */
  public static async blockSlot(doctorId: string, date: string, time: string) {
    const configKey = `doctor_blocked_slots_${doctorId}`;
    const slotString = `${date} ${time}`;

    const existingConfig = await prisma.config.findUnique({ where: { key: configKey } });
    const blockedSlots: string[] = existingConfig ? JSON.parse(existingConfig.value) : [];

    if (!blockedSlots.includes(slotString)) {
      blockedSlots.push(slotString);
      await prisma.config.upsert({
        where: { key: configKey },
        update: { value: JSON.stringify(blockedSlots) },
        create: { key: configKey, value: JSON.stringify(blockedSlots) },
      });
      logger.info(`Blocked slot [${slotString}] for doctor: ${doctorId}`);
    }

    broadcastEvent('dashboard:update', { type: 'SLOT_BLOCKED', doctorId, date, time });
    return blockedSlots;
  }

  /**
   * Adds clinic holidays.
   */
  public static async addClinicHoliday(holiday: string) {
    const configKey = 'clinic_holidays';

    const existingConfig = await prisma.config.findUnique({ where: { key: configKey } });
    const holidays: string[] = existingConfig ? JSON.parse(existingConfig.value) : [];

    if (!holidays.includes(holiday)) {
      holidays.push(holiday);
      await prisma.config.upsert({
        where: { key: configKey },
        update: { value: JSON.stringify(holidays) },
        create: { key: configKey, value: JSON.stringify(holidays) },
      });
      logger.info(`Registered clinic holiday: ${holiday}`);
    }

    broadcastEvent('dashboard:update', { type: 'HOLIDAY_ADDED', holiday });
    return holidays;
  }
}
export default DoctorsService;
