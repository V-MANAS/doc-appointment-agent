import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import DoctorsService from './services';

const updateSettingsSchema = z.object({
  workingHours: z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/, 'Working hours must be in HH:MM-HH:MM format').optional(),
  lunchBreak: z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/, 'Lunch break must be in HH:MM-HH:MM format').optional(),
  maxDailyBookings: z.coerce.number().int().positive('Max daily bookings must be a positive number').optional(),
});

export class DoctorsController {
  public static async getDoctors(req: Request, res: Response, next: NextFunction) {
    try {
      const doctors = await DoctorsService.getAllDoctors();
      res.status(200).json({ success: true, doctors });
    } catch (error) {
      next(error);
    }
  }

  public static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedData = updateSettingsSchema.parse(req.body);
      const doctor = await DoctorsService.updateDoctorSettings(id, validatedData);

      res.status(200).json({
        success: true,
        message: 'Doctor settings updated.',
        doctor,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async addLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { date } = req.body;
      if (!date) {
        return res.status(400).json({ success: false, message: 'Date is required' });
      }

      const leaves = await DoctorsService.addDoctorLeave(id, date);
      res.status(200).json({ success: true, message: 'Doctor leave registered successfully.', leaves });
    } catch (error) {
      next(error);
    }
  }

  public static async removeLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { date } = req.body;
      if (!date) {
        return res.status(400).json({ success: false, message: 'Date is required' });
      }

      const leaves = await DoctorsService.removeDoctorLeave(id, date);
      res.status(200).json({ success: true, message: 'Doctor leave removed successfully.', leaves });
    } catch (error) {
      next(error);
    }
  }

  public static async blockTimeSlot(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { date, time } = req.body;
      if (!date || !time) {
        return res.status(400).json({ success: false, message: 'Date and time are required' });
      }

      const blocked = await DoctorsService.blockSlot(id, date, time);
      res.status(200).json({ success: true, message: 'Time slot blocked successfully.', blocked });
    } catch (error) {
      next(error);
    }
  }

  public static async addHoliday(req: Request, res: Response, next: NextFunction) {
    try {
      const { holiday } = req.body;
      if (!holiday) {
        return res.status(400).json({ success: false, message: 'Holiday date/day name is required' });
      }

      const holidays = await DoctorsService.addClinicHoliday(holiday);
      res.status(200).json({ success: true, message: 'Clinic holiday added successfully.', holidays });
    } catch (error) {
      next(error);
    }
  }
}
export default DoctorsController;
