import models from "@models";
import { NotFoundError } from "ts-rails";

export class DriverEarningService {
  /**
   * 5.2 Lấy thông tin thu nhập & ví tài xế
   */
  async getEarnings(profileId: string, period?: string, from?: string, to?: string) {
    const driver = await models.driverProfile.findUnique({
      where: { id: profileId },
      select: { walletBalance: true, commissionRate: true, rating: true },
    });
    if (!driver) throw new NotFoundError("Hồ sơ tài xế không tìm thấy");

    // Build date filter
    let dateFilter: any = {};
    if (from || to) {
      dateFilter = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      };
    } else if (period) {
      const now = new Date();
      if (period === "today") {
        const start = new Date(now); start.setHours(0, 0, 0, 0);
        dateFilter = { gte: start };
      } else if (period === "week") {
        const start = new Date(now); start.setDate(now.getDate() - 7);
        dateFilter = { gte: start };
      } else if (period === "month") {
        const start = new Date(now); start.setDate(1); start.setHours(0, 0, 0, 0);
        dateFilter = { gte: start };
      }
    }

    const transactions = await models.walletTransaction.findMany({
      where: {
        driverId: profileId,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      orderBy: { createdAt: "desc" },
    });

    const totalEarned = transactions
      .filter((t:any) => t.transactionType === "earning")
      .reduce((sum:number, t:any) => sum + Number(t.amount), 0);

    const completedOrders = await models.order.count({
      where: {
        driverId: profileId,
        status: "completed",
        ...(Object.keys(dateFilter).length > 0 && { completedAt: dateFilter }),
      },
    });

    return {
      walletBalance: Number(driver.walletBalance),
      commissionRate: Number(driver.commissionRate),
      rating: Number(driver.rating),
      period: period ?? "all",
      totalEarned,
      completedOrders,
      transactions,
    };
  }
}
