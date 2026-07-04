import prisma from '../../infrastructure/database';
import logger from '../../logger';

export class AnalyticsService {
  /**
   * Generates aggregated statistics for the administrator dashboard.
   */
  public static async getDashboardStats() {
    try {
      // 1. Revenue Summaries
      const payments = await prisma.payment.findMany({
        where: { status: 'PAID' },
      });

      const totalRevenueCents = payments.reduce((acc, p) => acc + p.amount, 0);
      const stripeRevenueCents = payments.filter(p => p.method === 'STRIPE').reduce((acc, p) => acc + p.amount, 0);
      const cashRevenueCents = payments.filter(p => p.method === 'CASH').reduce((acc, p) => acc + p.amount, 0);

      // 2. Appointment Status Counts
      const totalAppointments = await prisma.appointment.count();
      const confirmedCount = await prisma.appointment.count({ where: { status: 'CONFIRMED' } });
      const cancelledCount = await prisma.appointment.count({ where: { status: 'CANCELLED' } });
      
      const cancellationRate = totalAppointments > 0 ? (cancelledCount / totalAppointments) * 100 : 0;

      // 3. Peak Booking Hours
      const timeSlotsGroup = await prisma.appointment.groupBy({
        by: ['time'],
        _count: { id: true },
        where: { status: 'CONFIRMED' },
      });

      const peakHours = timeSlotsGroup.map((g) => ({
        time: g.time,
        count: g._count.id,
      })).sort((a, b) => b.count - a.count);

      // 4. Doctor Workload
      const doctors = await prisma.doctor.findMany({
        include: {
          _count: {
            select: { appointments: { where: { status: 'CONFIRMED' } } },
          },
        },
      });

      const doctorWorkload = doctors.map((doc) => ({
        name: doc.name,
        specialty: doc.specialty,
        activeBookings: doc._count.appointments,
      }));

      // 5. Weekly Booking Trend (Past 7 days)
      const today = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);

      const apptsPastWeek = await prisma.appointment.findMany({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
        select: {
          date: true,
          status: true,
        },
      });

      // Aggregate counts by date in JS
      const trendMap: Record<string, { booked: number; cancelled: number }> = {};
      
      // Initialize past 7 days in map
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        trendMap[dateStr] = { booked: 0, cancelled: 0 };
      }

      for (const appt of apptsPastWeek) {
        if (trendMap[appt.date]) {
          if (appt.status === 'CONFIRMED') {
            trendMap[appt.date].booked++;
          } else {
            trendMap[appt.date].cancelled++;
          }
        }
      }

      const bookingTrends = Object.entries(trendMap).map(([date, counts]) => ({
        date,
        ...counts,
      }));

      // 6. Conversational Telemetry
      const userMessageCount = await prisma.conversation.count({ where: { role: 'user' } });
      const modelMessageCount = await prisma.conversation.count({ where: { role: 'model' } });

      return {
        revenue: {
          total: totalRevenueCents / 100, // Convert to dollars
          stripe: stripeRevenueCents / 100,
          cash: cashRevenueCents / 100,
        },
        appointments: {
          total: totalAppointments,
          confirmed: confirmedCount,
          cancelled: cancelledCount,
          cancellationRate: Math.round(cancellationRate * 10) / 10,
        },
        peakHours,
        doctorWorkload,
        bookingTrends,
        aiMetrics: {
          totalExchanges: userMessageCount,
          userTurns: userMessageCount,
          modelTurns: modelMessageCount,
        },
      };
    } catch (error) {
      logger.error('Error generating analytics dashboard stats:', error);
      throw error;
    }
  }
}
export default AnalyticsService;
