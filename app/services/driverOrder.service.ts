import models from "@models";
import { BadRequestError, ForbiddenError, NotFoundError } from "ts-rails";

export class DriverOrderService {
  /**
   * 5.1 Danh sách đơn đang chờ tài xế nhận (các đơn status = "ready" chưa có driverId)
   */
  async getAvailableOrders(profileId: string) {
    const driver = await models.driverProfile.findUnique({ where: { id: profileId } });
    if (!driver) throw new NotFoundError("Hồ sơ tài xế không tìm thấy");
    if (driver.currentStatus !== "online") {
      throw new ForbiddenError("Bạn phải ở trạng thái online để xem đơn chờ nhận");
    }

    const orders = await models.order.findMany({
      where: {
        status: "ready",
        driverId: null,
      },
      include: {
        restaurant: { select: { name: true, address: true, latitude: true, longitude: true } },
        orderItems: {
          include: { menuItem: { select: { name: true } } },
        },
        customer: { select: { fullName: true, phone: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return orders;
  }

  /**
   * 5.1 Danh sách đơn của tài xế đang giao (active)
   */
  async getMyActiveOrders(profileId: string) {
    return models.order.findMany({
      where: {
        driverId: profileId,
        status: { in: ["accepted", "delivering"] },
      },
      include: {
        restaurant: { select: { name: true, address: true, latitude: true, longitude: true } },
        customer: { select: { fullName: true, phone: true } },
        orderItems: { include: { menuItem: { select: { name: true } } } },
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
    if (order.status !== "ready") {
      throw new BadRequestError("Đơn hàng không ở trạng thái sẵn sàng để nhận");
    }
    if (order.driverId) {
      throw new BadRequestError("Đơn hàng đã được tài xế khác nhận");
    }

    const driver = await models.driverProfile.findUnique({ where: { id: profileId } });
    if (!driver || driver.currentStatus !== "online") {
      throw new ForbiddenError("Bạn phải online để nhận đơn");
    }

    const updated = await models.order.update({
      where: { id: orderId },
      data: {
        driverId: profileId,
        status: "accepted",
        acceptedAt: new Date(),
      },
      include: {
        restaurant: { select: { name: true, address: true, latitude: true, longitude: true } },
        customer: { select: { fullName: true, phone: true } },
        orderItems: { include: { menuItem: { select: { name: true } } } },
      },
    });

    // Ghi log OrderStatusHistory
    await models.orderStatusHistory.create({
      data: { orderId, status: "accepted" },
    });

    // Cập nhật trạng thái tài xế -> busy
    await models.driverProfile.update({
      where: { id: profileId },
      data: { currentStatus: "busy" },
    });

    return updated;
  }

  /**
   * 5.1 Bỏ qua / từ chối đơn (không thay đổi trạng thái đơn, chỉ ghi nhận)
   */
  async rejectOrder(profileId: string, orderId: string, reason?: string) {
    const order = await models.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("Đơn hàng không tìm thấy");
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
    const order = await models.order.findUnique({ where: { id: orderId } });
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

    const updated = await models.order.update({
      where: { id: orderId },
      data: updateData,
    });

    await models.orderStatusHistory.create({
      data: { orderId, status: mapped.orderStatus },
    });

    // Khi hoàn thành -> tài xế về online
    if (status === "completed") {
      await models.driverProfile.update({
        where: { id: profileId },
        data: { currentStatus: "online" },
      });

      // Cộng thu nhập vào ví tài xế
      const driver = await models.driverProfile.findUnique({ where: { id: profileId } });
      if (driver) {
        const earning = Number(order.finalAmount) * (Number(driver.commissionRate) / 100);
        await models.driverProfile.update({
          where: { id: profileId },
          data: { walletBalance: { increment: earning } },
        });
        await models.walletTransaction.create({
          data: {
            driverId: profileId,
            amount: earning,
            transactionType: "earning",
            description: `Thu nhập từ đơn #${orderId.slice(0, 8)}`,
          },
        });
      }
    }

    return { message: "Cập nhật trạng thái thành công", order: updated };
  }
}
