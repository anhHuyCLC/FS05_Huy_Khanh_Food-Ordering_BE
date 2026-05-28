import models from "@models";
import { NotFoundError } from "ts-rails";

export class DriverEarningService {
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
        ...(to   && { lte: new Date(to)   }),
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

    const [transactions, completedOrders] = await Promise.all([
      models.walletTransaction.findMany({
        where: {
          driverId: profileId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
        orderBy: { createdAt: "desc" },
      }),
      models.order.count({
        where: {
          driverId: profileId,
          status: "completed",
          ...(Object.keys(dateFilter).length > 0 && { completedAt: dateFilter }),
        },
      }),
    ]);

    const earningTx = transactions.filter((t: any) => t.transactionType === "earning");
    const totalEarned    = earningTx.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const totalWithdrawn = transactions
      .filter((t: any) => t.transactionType === "withdrawal")
      .reduce((s: number, t: any) => s + Number(t.amount), 0);

    // ── dailyBreakdown: group earning transactions by day ──────────────────
    const dayMap: Record<string, number> = {};
    for (const tx of earningTx) {
      const d = new Date(tx.createdAt);
      // Format "T2"–"CN" for current week, or "DD/MM" for older
      const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
      let label: string;
      if (diffDays < 7) {
        const viDays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
        label = viDays[d.getDay()];
      } else {
        label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      }
      dayMap[label] = (dayMap[label] ?? 0) + Number(tx.amount);
    }

    // Sort by actual date (last 7 entries for chart)
    const viOrder = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    const dailyBreakdown = Object.entries(dayMap)
      .map(([day, earnings]) => ({ day, earnings: Math.round(earnings / 1000) })) // đơn vị nghìn đồng
      .sort((a, b) => {
        const ai = viOrder.indexOf(a.day);
        const bi = viOrder.indexOf(b.day);
        if (ai !== -1 && bi !== -1) return ai - bi;
        return 0;
      })
      .slice(-7);

    return {
      walletBalance:  Number(driver.walletBalance),
      commissionRate: Number(driver.commissionRate),
      rating:         Number(driver.rating),
      period:         period ?? "all",
      totalEarned,
      totalWithdrawn,
      completedOrders,
      transactions,
      dailyBreakdown, // ← MỚI: FE dùng trực tiếp cho BarChart
    };
  }
}