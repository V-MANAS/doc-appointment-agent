import { Request, Response, NextFunction } from 'express';
import prisma from '../../infrastructure/database';
import logger from '../../logger';

export class AdminController {
  /**
   * Retrieves all registered patients.
   */
  public static async getPatients(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('Admin requested all patients list');
      const patients = await prisma.patient.findMany({
        orderBy: { createdAt: 'desc' },
      });
      res.status(200).json({ success: true, patients });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves all clinic appointments.
   */
  public static async getAppointments(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('Admin requested all appointments list');
      const appointments = await prisma.appointment.findMany({
        include: { patient: true, doctor: true },
        orderBy: [{ date: 'desc' }, { time: 'asc' }],
      });
      res.status(200).json({ success: true, appointments });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves all config variables.
   */
  public static async getConfig(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('Admin requested all configuration parameters');
      const configs = await prisma.config.findMany({
        orderBy: { key: 'asc' },
      });
      res.status(200).json({ success: true, configs });
    } catch (error) {
      next(error);
    }
  }
}
export default AdminController;
