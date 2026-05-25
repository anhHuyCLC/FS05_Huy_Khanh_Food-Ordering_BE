import models from "@models";
import { ApiV1Controller } from "../apiV1.controller";
import { NotFoundError } from "ts-rails";
import fs from "fs";
import path from "path";

export class ApiV1AdminDashboardController extends ApiV1Controller {
  // 1. GET /api/v1/admin/kpis
  async kpis() {
    const [revenueSum, activeOrders, totalRestaurants, pendingRestaurants, driversOnline, totalDrivers] = await Promise.all([
      models.order.aggregate({
        where: { status: "completed" },
        _sum: { finalAmount: true },
      }),
      models.order.count({
        where: {
          status: {
            in: ["pending", "accepted", "preparing", "ready", "delivering"],
          },
        },
      }),
      models.restaurant.count(),
      models.restaurant.count({
        where: { approvalStatus: "PENDING" },
      }),
      models.driverProfile.count({
        where: { currentStatus: "online" },
      }),
      models.driverProfile.count(),
    ]);

    const totalRevenue = Number(revenueSum._sum.finalAmount || 0);

    this.renderJson({
      totalRevenue,
      activeOrders,
      totalRestaurants,
      pendingRestaurants,
      driversOnline,
      totalDrivers,
    });
  }

  // 2. GET /api/v1/admin/revenue
  async revenue() {
    const completedOrders = await models.order.findMany({
      where: { status: "completed" },
      select: { createdAt: true, finalAmount: true },
      orderBy: { createdAt: "asc" },
    });

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData: Record<string, { revenue: number; orders: number }> = {};

    completedOrders.forEach((order) => {
      const date = new Date(order.createdAt);
      const monthLabel = months[date.getMonth()];
      if (!monthlyData[monthLabel]) {
        monthlyData[monthLabel] = { revenue: 0, orders: 0 };
      }
      monthlyData[monthLabel].revenue += Number(order.finalAmount || 0);
      monthlyData[monthLabel].orders += 1;
    });

    const result = months.map((month) => ({
      month,
      revenue: monthlyData[month]?.revenue || 0,
      orders: monthlyData[month]?.orders || 0,
    })).filter(item => item.revenue > 0 || item.orders > 0); // Only return active months

    // Default if empty
    if (result.length === 0) {
      result.push({ month: months[new Date().getMonth()], revenue: 0, orders: 0 });
    }

    this.renderJson(result);
  }

  // 3. GET /api/v1/admin/categories/stats
  async categoryStats() {
    const orderItems = await models.orderItem.findMany({
      include: {
        menuItem: {
          include: { category: true },
        },
      },
    });

    const categoryCounts: Record<string, number> = {};
    let totalItems = 0;

    orderItems.forEach((item) => {
      const catName = item.menuItem?.category?.name || "Other";
      categoryCounts[catName] = (categoryCounts[catName] || 0) + item.quantity;
      totalItems += item.quantity;
    });

    const colors = ["#FF4500", "#6366F1", "#F59E0B", "#10B981", "#E5E7EB"];
    const pieData = Object.entries(categoryCounts).map(([name, count], index) => {
      const percentage = totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;
      return {
        name,
        value: percentage,
        color: colors[index % colors.length],
      };
    });

    if (pieData.length === 0) {
      pieData.push({ name: "No Orders", value: 100, color: "#E5E7EB" });
    }

    this.renderJson(pieData);
  }

  // 4. GET /api/v1/admin/orders
  async orders() {
    const orders = await models.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        restaurant: true,
        driver: {
          include: { profile: true },
        },
      },
    });

    const result = orders.map((o) => {
      const duration = "15 min"; // Mock or calculate
      return {
        id: `#${o.id.slice(0, 8).toUpperCase()}`,
        customer: o.customer?.fullName || "Customer",
        restaurant: o.restaurant?.name || "Restaurant",
        driver: o.driver?.profile?.fullName || "",
        amount: `${Number(o.finalAmount || 0).toLocaleString("vi-VN")}đ`,
        status: o.status,
        time: duration,
      };
    });

    this.renderJson(result);
  }

  // 5. GET /api/v1/admin/restaurants/pending
  async pendingRestaurants() {
    const restaurants = await models.restaurant.findMany({
      where: { approvalStatus: "PENDING" },
      include: { owner: true },
    });

    const result = restaurants.map((r) => {
      const diffTime = Math.abs(new Date().getTime() - new Date(r.createdAt).getTime());
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      const appliedTime = diffHours < 24 ? `${diffHours}h ago` : `${Math.floor(diffHours / 24)}d ago`;

      return {
        id: r.id,
        name: r.name,
        cuisine: r.description || "General",
        owner: r.owner?.fullName || "Owner",
        city: r.address || "Da Nang",
        applied: appliedTime,
      };
    });

    this.renderJson(result);
  }

  // 6. GET /api/v1/admin/fraud-alerts
  async fraudAlerts() {
    const flaggedOrders = await models.order.findMany({
      where: { isFlagged: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    const result = flaggedOrders.map((o) => {
      const riskScore = Number(o.riskScore || 0);
      const riskLevel = riskScore > 75 ? "High" : "Medium";
      return {
        id: `#ORD-${o.id.slice(0, 8).toUpperCase()}`,
        type: "Flagged Risk",
        detail: `Risk score: ${riskScore} | IP: ${o.deviceIp || "N/A"}`,
        risk: riskLevel,
        time: "Just now",
      };
    });

    this.renderJson(result);
  }

  // 7. PATCH /api/v1/admin/restaurants/:restaurantId/status
  async updateRestaurantStatus() {
    const { restaurantId } = this.req.params;
    const { status, rejectionReason } = this.req.body;

    const restaurant = await models.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) throw new NotFoundError("Restaurant not found");

    const normalizedStatus = status.toUpperCase(); // APPROVED, REJECTED, PENDING

    await models.restaurant.update({
      where: { id: restaurantId },
      data: {
        approvalStatus: normalizedStatus,
        isActive: normalizedStatus === "APPROVED",
        rejectionReason: normalizedStatus === "REJECTED" ? rejectionReason : null,
      },
    });

    this.renderJson({ success: true });
  }

  // GET /api/v1/admin/drivers/pending
  async pendingDrivers() {
    const drivers = await models.driverProfile.findMany({
      where: { approvalStatus: "PENDING" },
      include: {
        profile: true,
      },
    });

    const result = drivers.map((d) => {
      return {
        id: d.id,
        fullName: d.profile.fullName,
        phone: d.profile.phone,
        vehicleInfo: d.vehicleInfo,
        licensePlate: d.licensePlate,
        driverLicenseNumber: d.driverLicenseNumber,
        nationalIdNumber: d.nationalIdNumber,
        approvalStatus: d.approvalStatus,
        createdAt: d.profile.createdAt,
      };
    });

    this.renderJson(result);
  }

  // PATCH /api/v1/admin/drivers/:driverId/status
  async updateDriverStatus() {
    const { driverId } = this.req.params;
    const { status, rejectionReason } = this.req.body;

    const driver = await models.driverProfile.findUnique({
      where: { id: driverId },
    });

    if (!driver) throw new NotFoundError("Driver profile not found");

    const normalizedStatus = status.toUpperCase(); // APPROVED, REJECTED, PENDING

    await models.driverProfile.update({
      where: { id: driverId },
      data: {
        approvalStatus: normalizedStatus,
        rejectionReason: normalizedStatus === "REJECTED" ? rejectionReason : null,
      },
    });

    this.renderJson({ success: true });
  }

  // 8. PATCH /api/v1/admin/users/status
  async updateUserStatus() {
    const { email, status } = this.req.body;

    const user = await models.user.findFirst({
      where: { email },
    });

    if (!user) throw new NotFoundError("User not found");

    const mappedStatus = status === "suspended" ? "INACTIVE" : "ACTIVE";

    await models.user.update({
      where: { id: user.id },
      data: { status: mappedStatus },
    });

    this.renderJson({ success: true });
  }

  // GET /api/v1/admin/restaurants/active
  async activeRestaurants() {
    const restaurants = await models.restaurant.findMany({
      where: { approvalStatus: "APPROVED" },
      include: {
        owner: true,
        _count: {
          select: { orders: true },
        },
      },
    });

    const result = restaurants.map((r) => ({
      id: r.id,
      name: r.name,
      cuisine: r.cuisineType || "General",
      owner: r.owner?.fullName || "Owner",
      city: r.address || "Da Nang",
      rating: Number(r.rating || 0),
      orders: r._count.orders,
      status: r.isActive ? "open" : "closed",
    }));

    this.renderJson(result);
  }

  // GET /api/v1/admin/drivers/active
  async activeDrivers() {
    const drivers = await models.driverProfile.findMany({
      where: { approvalStatus: "APPROVED" },
      include: {
        profile: true,
      },
    });

    const result = drivers.map((d) => ({
      id: d.id,
      name: d.profile.fullName,
      phone: d.profile.phone || "",
      vehicle: d.vehicleInfo || "",
      plate: d.licensePlate || "",
      rating: Number(d.rating || 0),
      status: d.currentStatus || "offline",
    }));

    this.renderJson(result);
  }

  // GET /api/v1/admin/announcements
  async getAnnouncements() {
    const filePath = path.join(process.cwd(), "configs", "db", "announcements.json");
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      this.renderJson(JSON.parse(data));
    } catch (err) {
      this.renderJson([]);
    }
  }

  // POST /api/v1/admin/announcements
  async createAnnouncement() {
    const { title, content } = this.req.body;
    const filePath = path.join(process.cwd(), "configs", "db", "announcements.json");
    let announcements = [];
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      announcements = JSON.parse(data);
    } catch (err) {
      // empty
    }

    const newAnnouncement = {
      id: Date.now(),
      title,
      content,
      time: "Vừa xong",
      author: "Hệ thống",
    };

    announcements.unshift(newAnnouncement);
    fs.writeFileSync(filePath, JSON.stringify(announcements, null, 2), "utf-8");
    this.renderJson(newAnnouncement);
  }

  // DELETE /api/v1/admin/announcements/:id
  async deleteAnnouncement() {
    const id = Number(this.req.params.id);
    const filePath = path.join(process.cwd(), "configs", "db", "announcements.json");
    let announcements = [];
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      announcements = JSON.parse(data);
    } catch (err) {
      // empty
    }

    announcements = announcements.filter((a: any) => a.id !== id);
    fs.writeFileSync(filePath, JSON.stringify(announcements, null, 2), "utf-8");
    this.renderJson({ success: true });
  }

  // GET /api/v1/admin/settings
  async getSettings() {
    const filePath = path.join(process.cwd(), "configs", "db", "system_settings.json");
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      this.renderJson(JSON.parse(data));
    } catch (err) {
      this.renderJson({
        commissionRate: 15,
        autoAssign: true,
        baseDeliveryFee: 15000,
        systemAlertsEnabled: true,
        maintenanceMode: false,
      });
    }
  }

  // PUT /api/v1/admin/settings
  async updateSettings() {
    const { commissionRate, autoAssign, baseDeliveryFee, systemAlertsEnabled, maintenanceMode } = this.req.body;
    const filePath = path.join(process.cwd(), "configs", "db", "system_settings.json");
    const settings = {
      commissionRate: Number(commissionRate),
      autoAssign: Boolean(autoAssign),
      baseDeliveryFee: Number(baseDeliveryFee),
      systemAlertsEnabled: Boolean(systemAlertsEnabled),
      maintenanceMode: Boolean(maintenanceMode),
    };

    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), "utf-8");
    this.renderJson({ success: true, settings });
  }

  // GET /api/v1/admin/payouts
  async payouts() {
    const payments = await models.payment.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          include: {
            restaurant: true,
            customer: true,
          },
        },
      },
    });

    const result = payments.map((p) => {
      const type = p.order?.restaurant 
        ? `Thanh toán cho ${p.order.restaurant.name}` 
        : p.order?.customer
        ? `Hoàn tiền cho khách hàng ${p.order.customer.fullName}`
        : "Thanh toán giao dịch";

      return {
        id: `TX${p.id.slice(0, 6).toUpperCase()}`,
        type,
        status: p.status === "success" ? "completed" : p.status,
        date: new Date(p.createdAt).toLocaleDateString("vi-VN"),
        amount: `${Number(p.amount || 0).toLocaleString("vi-VN")}đ`,
      };
    });

    this.renderJson(result);
  }
}

