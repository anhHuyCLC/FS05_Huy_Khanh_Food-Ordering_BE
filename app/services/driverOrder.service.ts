import models from "@models";
import { BadRequestError, ForbiddenError, NotFoundError } from "ts-rails";

function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class DriverOrderService {
  /**
   * 5.1 Danh sách đơn đang chờ tài xế nhận (các đơn status = "ready" chưa có driverId)
   */
  async getAvailableOrders(profileId: string) {
    const driver = await models.driverProfile.findUnique({ where: { id: profileId } });
    if (!driver) throw new NotFoundError("Hồ sơ tài xế không tìm thấy");
    // if (driver.currentStatus !== "online") {
    //   throw new ForbiddenError("Bạn phải ở trạng thái online để xem đơn chờ nhận");
    // }

    const orders = await models.order.findMany({
      where: {
        OR: [
          {
            status: "ready",
            driverId: null,
            currentDriverId: null,
          },
          {
            status: "ready",
            driverId: null,
            assignmentExpiresAt: { lte: new Date() },
          },
          {
            currentDriverId: profileId,
            assignmentExpiresAt: { gt: new Date() },
          },
        ],
      },
      include: {
        restaurant: { select: { name: true, address: true, latitude: true, longitude: true } },
        orderItems: {
          include: { menuItem: { select: { name: true } } },
        },
        customer: { select: { fullName: true, phone: true } },
        payment: { select: { method: true, amount: true, status: true } },
      },
      orderBy: { createdAt: "asc" },
    });

   const driverLoc = await models.driverLocation.findUnique({
      where: { driverId: profileId },
    });

    // Gắn distance vào từng đơn
    return orders.map((order) => {
      let distance: number | null = null;

      if (
        driverLoc &&
        order.restaurant.latitude &&
        order.restaurant.longitude
      ) {
        const dist = calculateDistance(
          Number(driverLoc.latitude),
          Number(driverLoc.longitude),
          Number(order.restaurant.latitude),
          Number(order.restaurant.longitude)
        );
        distance = Math.round(dist * 10) / 10; // làm tròn 1 chữ số thập phân
      }

      return { ...order, distance };
    });
  }

  /**
   * 5.1 Danh sách đơn của tài xế đang giao (active)
   */
  async getMyActiveOrders(profileId: string) {
    return models.order.findMany({
      where: {
        driverId: profileId,
        status: { in: ["accepted", "preparing", "ready", "delivering"] },
      },
      include: {
        restaurant: { select: { name: true, address: true, latitude: true, longitude: true } },
        customer: { select: { fullName: true, phone: true } },
        orderItems: { include: { menuItem: { select: { name: true } } } },
        payment: { select: { method: true, amount: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * 5.1 Lịch sử đơn đã giao
   */
  async getOrderHistory(profileId: string, skip = 0, take = 20) {
    return models.order.findMany({
      where: {
        driverId: profileId,
        status: { in: ["completed", "cancelled"] },
      },
      include: {
        restaurant: { select: { name: true } },
        customer: { select: { fullName: true } },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  }

  /**
   * 5.1 Chấp nhận đơn giao
   */
  async acceptOrder(profileId: string, orderId: string) {
    const order = await models.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("Đơn hàng không tìm thấy");

    const isOfferedToMe =
      order.currentDriverId === profileId &&
      order.assignmentExpiresAt &&
      order.assignmentExpiresAt > new Date();

    const isOfferedToAnotherDriver =
      order.currentDriverId &&
      order.currentDriverId !== profileId &&
      order.assignmentExpiresAt &&
      order.assignmentExpiresAt > new Date();

    console.log("[DriverOrderService.acceptOrder] Validation state:", {
      orderId,
      profileId,
      orderStatus: order.status,
      orderDriverId: order.driverId,
      orderCurrentDriverId: order.currentDriverId,
      orderAssignmentExpiresAt: order.assignmentExpiresAt,
      isOfferedToMe,
      isOfferedToAnotherDriver,
      now: new Date(),
    });

    if (isOfferedToAnotherDriver) {
      console.log("[DriverOrderService.acceptOrder] FAIL: Offered to another driver");
      throw new BadRequestError("Đơn hàng này đang được gán cho tài xế khác");
    }

    if (order.status !== "ready" && !isOfferedToMe) {
      console.log("[DriverOrderService.acceptOrder] FAIL: Order not ready and not offered to me");
      throw new BadRequestError("Đơn hàng không ở trạng thái sẵn sàng để nhận");
    }
    if (order.driverId) {
      console.log("[DriverOrderService.acceptOrder] FAIL: Order already has driverId assigned");
      throw new BadRequestError("Đơn hàng đã được tài xế khác nhận");
    }

    const driver = await models.driverProfile.findUnique({ where: { id: profileId } });
    // if (!driver || driver.currentStatus !== "online") {
    //   throw new ForbiddenError("Bạn phải online để nhận đơn");
    // }

    const updated = await models.order.update({
      where: { id: orderId },
      data: {
        driverId: profileId,
        // Giữ nguyên status hiện tại (ready) — driver sẽ chuyển sang delivering sau
        acceptedAt: new Date(),
        currentDriverId: null,
        assignmentExpiresAt: null,
        assignmentQueue: [],
      },
      include: {
        restaurant: { select: { name: true, address: true, latitude: true, longitude: true } },
        customer: { select: { fullName: true, phone: true } },
        orderItems: { include: { menuItem: { select: { name: true } } } },
        payment: { select: { method: true, amount: true, status: true } },
      },
    });

    console.log("[DriverOrderService.acceptOrder] SUCCESS: Order accepted");

    // Ghi log OrderStatusHistory
    await models.orderStatusHistory.create({
      data: { orderId, status: updated.status! },
    });

    // Cập nhật trạng thái tài xế -> busy
    await models.driverProfile.update({
      where: { id: profileId },
      data: { currentStatus: "busy" },
    });

    return updated;
  }

  /**
   * 5.1 Bỏ qua / từ chối đơn
   */
  async rejectOrder(profileId: string, orderId: string, reason?: string) {
    const order = await models.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("Đơn hàng không tìm thấy");

    // Nếu đây là offer hiện tại cho tài xế này -> chuyển tiếp sang tài xế tiếp theo ngay lập tức
    if (order.currentDriverId === profileId) {
      const { DriverAssignmentService } = require("./driverAssignment.service");
      const service = new DriverAssignmentService();
      await service.offerToNextDriver(orderId);
      return { message: "Đã từ chối đơn hàng", orderId, reason: reason ?? null };
    }

    if (order.driverId && order.driverId !== profileId) {
      throw new ForbiddenError("Đơn hàng này không thuộc về bạn");
    }
    // Tài xế bỏ qua -> không gán, trả về thông báo
    return { message: "Đã bỏ qua đơn hàng", orderId, reason: reason ?? null };
  }

  /**
   * 5.1 Cập nhật trạng thái giao hàng
   * status: "picked_up" => delivering, "delivering" => delivering, "completed" => completed
   */
  async updateDeliveryStatus(profileId: string, orderId: string, status: string) {
    const order = await models.order.findUnique({ where: { id: orderId }, include: { payment: true } });
    if (!order) throw new NotFoundError("Đơn hàng không tìm thấy");
    if (order.driverId !== profileId) {
      throw new ForbiddenError("Đây không phải đơn hàng của bạn");
    }

    const statusMap: Record<string, { orderStatus: any; timestampField: string | null }> = {
      picked_up:  { orderStatus: "delivering", timestampField: "deliveringAt" },
      delivering: { orderStatus: "delivering", timestampField: "deliveringAt" },
      completed:  { orderStatus: "completed",  timestampField: "completedAt" },
    };

    const mapped = statusMap[status];
    if (!mapped) throw new BadRequestError("Trạng thái không hợp lệ");

    const updateData: any = { status: mapped.orderStatus };
    if (mapped.timestampField) updateData[mapped.timestampField] = new Date();

    const result = await models.$transaction(async (tx) => {
  const updated = await tx.order.update({
    where: { id: orderId },
    data:  updateData,
  });

  await tx.orderStatusHistory.create({
    data: { orderId, status: mapped.orderStatus },
  });

  if (status === "completed") {
    const driver = await tx.driverProfile.findUnique({ where: { id: profileId } });
    if (driver) {
      // 1. Calculate Delivery Fee
      const deliveryFee = Number(order.finalAmount) - Number(order.totalAmount) + Number(order.discountAmount || 0);

      // 2. Calculate Driver Earning based on Delivery Fee
      const commissionRate = Number(driver.commissionRate) / 100;
      const earning = deliveryFee * (1 - commissionRate);

      // 3. Determine Payment Method
      const isCOD = order.payment && order.payment.length > 0 && order.payment[0].method === "cash";

      if (isCOD) {
        // Option A: Ghi nhận công nợ đúng bằng tổng tiền thu hộ, cộng tiền ví đúng bằng thu nhập
        await tx.driverProfile.update({
          where: { id: profileId },
          data: {
            currentStatus: "online",
            walletBalance: { increment: earning },
            codDebt: { increment: Number(order.finalAmount) },
          },
        });

        // Ghi transaction thu nhập
        await tx.walletTransaction.create({
          data: {
            driverId: profileId,
            amount: earning,
            transactionType: "earning",
            description: `Thu nhập từ đơn COD #${orderId.slice(0, 8).toUpperCase()}`,
          },
        });

      } else {
        // Online payment
        await tx.driverProfile.update({
          where: { id: profileId },
          data: {
            currentStatus: "online",
            walletBalance: { increment: earning },
          },
        });

        await tx.walletTransaction.create({
          data: {
            driverId: profileId,
            amount: earning,
            transactionType: "earning",
            description: `Thu nhập từ đơn Online #${orderId.slice(0, 8).toUpperCase()}`,
          },
        });
      }
    }
  }

  return updated;
});

return { message: "Cập nhật trạng thái thành công", order: result };
  }
} 
