import models from "@models";
import {
  CancelOrderValidator,
  CreateOrderValidator,
  UpdateOrderStatusValidator,
} from "@validators/order.validator";
import { NotFoundError, UnauthorizedError } from "ts-rails";
import { ApiV1Controller } from "./apiV1.controller";

/**
 * Sơ đồ chuyển đổi trạng thái hợp lệ:
 * pending → accepted (restaurant) | cancelled (customer/restaurant)
 * accepted → preparing (restaurant) | cancelled (restaurant)
 * preparing → ready (restaurant)
 * ready → delivering (driver)
 * delivering → completed (driver)
 */
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready"],
  ready: ["delivering"],
  delivering: ["completed"],
  completed: [],
  cancelled: [],
};

export class OrderControllerV1 extends ApiV1Controller {
  // ─────────────────────────────────────────────────────────────
  // GET /orders
  // Danh sách đơn hàng của customer đang đăng nhập
  // ─────────────────────────────────────────────────────────────
  async index() {
    const currentUserId = this.currentUser?.id;
    if (!currentUserId) throw new UnauthorizedError("Cần đăng nhập");

    const { status, page, limit } = this.req.query as Record<string, string>;
    const take = parseInt(limit) || 10;
    const skip = (parseInt(page) - 1 || 0) * take;

    const where: Record<string, unknown> = { customerId: currentUserId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      models.order.findMany({
        where,
        include: {
          restaurant: { select: { id: true, name: true, address: true } },
          orderItems: {
            include: {
              menuItem: {
                select: { id: true, name: true, imageUrl: true, basePrice: true },
              },
            },
          },
          promotion: {
            select: { code: true, discountPercentage: true, fixedDiscount: true },
          },
          payment: { select: { status: true, method: true, amount: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      models.order.count({ where }),
    ]);

    this.renderJson({
      success: true,
      data: orders,
      meta: { total, page: parseInt(page) || 1, limit: take },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // GET /orders/:orderId
  // Chi tiết đơn hàng (customer, restaurant owner, driver)
  // ─────────────────────────────────────────────────────────────
  async show() {
    const { orderId } = this.req.params;
    const currentUserId = this.currentUser?.id;
    if (!currentUserId) throw new UnauthorizedError("Cần đăng nhập");

    const order = await models.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: {
          select: { id: true, name: true, address: true, ownerId: true },
        },
        customer: { select: { id: true, fullName: true, phone: true } },
        driver: {
          select: {
            id: true,
            profile: { select: { fullName: true, phone: true } },
          },
        },
        orderItems: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                basePrice: true,
                description: true,
              },
            },
          },
        },
        promotion: true,
        payment: true,
        orderStatusHistories: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!order) throw new NotFoundError("Đơn hàng không tìm thấy");

    const isCustomer = order.customerId === currentUserId;
    const isOwner = order.restaurant.ownerId === currentUserId;
    const isDriver = order.driverId === currentUserId;

    if (!isCustomer && !isOwner && !isDriver) {
      throw new UnauthorizedError("Bạn không có quyền xem đơn hàng này");
    }

    this.renderJson({ success: true, data: order });
  }

  // ─────────────────────────────────────────────────────────────
  // POST /orders
  // Khách hàng tạo đơn hàng mới
  // ─────────────────────────────────────────────────────────────
  async create() {
    const currentUserId = this.currentUser?.id;
    if (!currentUserId) throw new UnauthorizedError("Cần đăng nhập để đặt hàng");

    const data = await this.params(CreateOrderValidator).permit(
      "restaurantId",
      "orderType",
      "items",
      "deliveryAddress",
      "promotionCode",
      "note",
      "tableNumber",
      "reservationTime"
    );

    if (!data.items || data.items.length === 0) {
      return this.renderJson({ success: false, message: "Giỏ hàng trống" }, 400);
    }

    // Kiểm tra nhà hàng tồn tại & đang hoạt động
    const restaurant = await models.restaurant.findUnique({
      where: { id: data.restaurantId },
    });
    if (!restaurant) throw new NotFoundError("Nhà hàng không tìm thấy");
    if (!restaurant.isActive) {
      return this.renderJson(
        { success: false, message: "Nhà hàng hiện không hoạt động" },
        400
      );
    }

    // Kiểm tra & lấy thông tin từng MenuItem
    const menuItemIds = (data.items as any[]).map((i: any) => i.menuItemId);
    const menuItems = await models.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        restaurantId: data.restaurantId,
        isAvailable: true,
      },
    });

    if (menuItems.length !== menuItemIds.length) {
      return this.renderJson(
        {
          success: false,
          message: "Một hoặc nhiều món ăn không hợp lệ hoặc không có sẵn",
        },
        400
      );
    }

    type MenuItemRow = (typeof menuItems)[number];
    const menuItemMap = new Map<string, MenuItemRow>(menuItems.map((m: any) => [m.id, m]));


    // Tính tổng tiền
    let totalAmount = 0;
    const orderItemsData = (data.items as any[]).map((item: any) => {
      const menuItem = menuItemMap.get(item.menuItemId)!;
      const unitPrice = Number(menuItem.basePrice);
      totalAmount += unitPrice * item.quantity;
      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice,
        selectedOptions: item.selectedOptions ?? {},
        note: item.note ?? null,
      };
    });

    // Xử lý mã khuyến mãi
    let promotionId: string | null = null;
    let discountAmount = 0;

    if (data.promotionCode) {
      const promo = await models.promotion.findFirst({
        where: {
          code: data.promotionCode,
          isActive: true,
          validFrom: { lte: new Date() },
          validTo: { gte: new Date() },
          OR: [
            { restaurantId: data.restaurantId },
            { restaurantId: null }, // global promotion
          ],
        },
      });

      if (!promo) {
        return this.renderJson(
          { success: false, message: "Mã khuyến mãi không hợp lệ hoặc đã hết hạn" },
          400
        );
      }

      const minOrder = Number(promo.minOrderValue ?? 0);
      if (totalAmount < minOrder) {
        return this.renderJson(
          {
            success: false,
            message: `Đơn hàng tối thiểu ${minOrder.toLocaleString("vi-VN")}đ để dùng mã này`,
          },
          400
        );
      }

      promotionId = promo.id;
      if (promo.discountPercentage) {
        discountAmount = (totalAmount * Number(promo.discountPercentage)) / 100;
      } else if (promo.fixedDiscount) {
        discountAmount = Math.min(Number(promo.fixedDiscount), totalAmount);
      }
    }

    const finalAmount = Math.max(0, totalAmount - discountAmount);
    const platformFee = finalAmount * 0.1;
    const restaurantNet = finalAmount - platformFee;

    // Tạo Order + OrderItems trong một transaction
    const order = await models.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          customerId: currentUserId,
          restaurantId: data.restaurantId,
          orderType: (data.orderType as any) ?? "standard_delivery",
          status: "pending",
          totalAmount,
          discountAmount,
          finalAmount,
          platformFee,
          restaurantNet,
          promotionId,
          deliveryAddress: data.deliveryAddress ?? null,
          note: data.note ?? null,
          tableNumber: data.tableNumber ?? null,
          reservationTime: data.reservationTime
            ? new Date(data.reservationTime as string)
            : null,
          deviceIp: (this.req.ip ?? null) as string | null,
          orderItems: {
            create: orderItemsData,
          },
        },
        include: {
          orderItems: {
            include: {
              menuItem: { select: { id: true, name: true, imageUrl: true } },
            },
          },
          restaurant: { select: { id: true, name: true } },
          promotion: { select: { code: true } },
        },
      });

      // Ghi lịch sử trạng thái ban đầu
      await tx.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          status: "pending",
          note: "Đơn hàng vừa được tạo",
        },
      });

      return newOrder;
    });

    this.renderJson(
      { success: true, message: "Đặt hàng thành công", data: order },
      201
    );
  }

  // ─────────────────────────────────────────────────────────────
  // PATCH /orders/:orderId/status
  // Restaurant owner / driver cập nhật trạng thái đơn hàng
  // ─────────────────────────────────────────────────────────────
  async updateStatus() {
    const { orderId } = this.req.params;
    const currentUserId = this.currentUser?.id;
    if (!currentUserId) throw new UnauthorizedError("Cần đăng nhập");

    const data = await this.params(UpdateOrderStatusValidator).permit("status", "note");
    const newStatus = data.status as string;

    const order = await models.order.findUnique({
      where: { id: orderId },
      include: { restaurant: { select: { ownerId: true } } },
    });
    if (!order) throw new NotFoundError("Đơn hàng không tìm thấy");

    const currentStatus = order.status as string;

    // Kiểm tra chuyển trạng thái có hợp lệ không
    const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      return this.renderJson(
        {
          success: false,
          message: `Không thể chuyển từ "${currentStatus}" sang "${newStatus}"`,
        },
        400
      );
    }

    // Kiểm tra quyền
    const isOwner = order.restaurant.ownerId === currentUserId;
    const isDriver = order.driverId === currentUserId;

    const restaurantStatuses = ["accepted", "preparing", "ready", "cancelled"];
    const driverStatuses = ["delivering", "completed"];

    if (restaurantStatuses.includes(newStatus) && !isOwner) {
      throw new UnauthorizedError("Chỉ chủ nhà hàng mới có thể cập nhật trạng thái này");
    }
    if (driverStatuses.includes(newStatus) && !isDriver) {
      throw new UnauthorizedError("Chỉ tài xế mới có thể cập nhật trạng thái này");
    }

    // Gán timestamp tương ứng theo trạng thái
    const now = new Date();
    const timestampUpdate: Record<string, Date> = {};
    if (newStatus === "accepted") timestampUpdate.acceptedAt = now;
    if (newStatus === "preparing") timestampUpdate.preparingAt = now;
    if (newStatus === "delivering") timestampUpdate.deliveringAt = now;
    if (newStatus === "completed") timestampUpdate.completedAt = now;
    if (newStatus === "cancelled") timestampUpdate.cancelledAt = now;

    const [updatedOrder] = await models.$transaction([
      models.order.update({
        where: { id: orderId },
        data: { status: newStatus as any, ...timestampUpdate },
        include: {
          restaurant: { select: { id: true, name: true } },
          customer: { select: { id: true, fullName: true } },
        },
      }),
      models.orderStatusHistory.create({
        data: {
          orderId,
          status: newStatus as any,
          note: data.note ?? null,
        },
      }),
    ]);

    this.renderJson({
      success: true,
      message: `Cập nhật trạng thái thành "${newStatus}" thành công`,
      data: updatedOrder,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // PATCH /orders/:orderId/cancel
  // Khách hàng huỷ đơn (chỉ khi trạng thái "pending")
  // ─────────────────────────────────────────────────────────────
  async cancel() {
    const { orderId } = this.req.params;
    const currentUserId = this.currentUser?.id;
    if (!currentUserId) throw new UnauthorizedError("Cần đăng nhập");

    const data = await this.params(CancelOrderValidator).permit("reason");

    const order = await models.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("Đơn hàng không tìm thấy");

    if (order.customerId !== currentUserId) {
      throw new UnauthorizedError("Bạn không có quyền huỷ đơn hàng này");
    }

    if (order.status !== "pending") {
      return this.renderJson(
        {
          success: false,
          message: "Chỉ có thể huỷ khi đơn hàng đang ở trạng thái chờ xác nhận",
        },
        400
      );
    }

    const [cancelledOrder] = await models.$transaction([
      models.order.update({
        where: { id: orderId },
        data: { status: "cancelled", cancelledAt: new Date() },
      }),
      models.orderStatusHistory.create({
        data: {
          orderId,
          status: "cancelled",
          note: data.reason ?? "Khách hàng huỷ đơn",
        },
      }),
    ]);

    this.renderJson({
      success: true,
      message: "Huỷ đơn hàng thành công",
      data: cancelledOrder,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // GET /restaurants/:restaurantId/orders
  // Restaurant owner xem danh sách đơn của nhà hàng mình
  // ─────────────────────────────────────────────────────────────
  async restaurantOrders() {
    const { restaurantId } = this.req.params;
    const currentUserId = this.currentUser?.id;
    if (!currentUserId) throw new UnauthorizedError("Cần đăng nhập");

    const restaurant = await models.restaurant.findUnique({
      where: { id: restaurantId },
      select: { ownerId: true },
    });
    if (!restaurant) throw new NotFoundError("Nhà hàng không tìm thấy");
    if (restaurant.ownerId !== currentUserId) {
      throw new UnauthorizedError("Bạn không có quyền xem đơn hàng của nhà hàng này");
    }

    const { status, page, limit } = this.req.query as Record<string, string>;
    const take = parseInt(limit) || 20;
    const skip = (parseInt(page) - 1 || 0) * take;

    const where: Record<string, unknown> = { restaurantId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      models.order.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true, phone: true } },
          orderItems: {
            include: {
              menuItem: { select: { id: true, name: true, basePrice: true } },
            },
          },
          promotion: { select: { code: true } },
          payment: { select: { status: true, method: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      models.order.count({ where }),
    ]);

    this.renderJson({
      success: true,
      data: orders,
      meta: { total, page: parseInt(page) || 1, limit: take },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // GET /orders/:orderId/history
  // Lịch sử thay đổi trạng thái đơn hàng
  // ─────────────────────────────────────────────────────────────
  async statusHistory() {
    const { orderId } = this.req.params;
    const currentUserId = this.currentUser?.id;
    if (!currentUserId) throw new UnauthorizedError("Cần đăng nhập");

    const order = await models.order.findUnique({
      where: { id: orderId },
      include: {
        orderStatusHistories: { orderBy: { createdAt: "asc" } },
        restaurant: { select: { ownerId: true } },
      },
    });
    if (!order) throw new NotFoundError("Đơn hàng không tìm thấy");

    const isCustomer = order.customerId === currentUserId;
    const isOwner = order.restaurant.ownerId === currentUserId;
    const isDriver = order.driverId === currentUserId;

    if (!isCustomer && !isOwner && !isDriver) {
      throw new UnauthorizedError("Bạn không có quyền xem đơn hàng này");
    }

    this.renderJson({ success: true, data: order.orderStatusHistories });
  }
}