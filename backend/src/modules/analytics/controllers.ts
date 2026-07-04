import { Request, Response, NextFunction } from 'express';
import AnalyticsService from './services';

export class AnalyticsController {
  public static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AnalyticsService.getDashboardStats();
      res.status(200).json({ success: true, stats });
    } catch (error) {
      next(error);
    }
  }
}
export default AnalyticsController;
