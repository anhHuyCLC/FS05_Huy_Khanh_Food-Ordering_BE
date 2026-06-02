import { Prisma } from "@db";
import models from "@models";
import {
  CancelOrderValidator,
  CreateOrderValidator,
  CreateReviewValidator,
  UpdateOrderStatusValidator,
} from "@validators/order.validator";
import { NotFoundError, UnauthorizedError } from "ts-rails";
import { ApiV1Controller } from "./apiV1.controller";
import dayjs from "dayjs";

function getStableCoords(
  id: string,
  text: string,
): { latitude: number; longitude: number } {
  const input = `${id}-${text}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const lat = 16.054404 + (hash % 100) / 1000;
  const lon = 108.202167 + ((hash >> 2) % 100) / 1000;
  return { latitude: lat, longitude: lon };
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateDeliveryFee(distance: number): number {
  if (distance <= 2) {
    return 15000;
  }
  const additionalKm = Math.ceil(distance - 2);
  return 15000 + additionalKm * 5000;
}

function isPromotionActive(promotion: any) {
  const now = new Date();
  const validFrom = new Date(promotion.validFrom);
  const validTo = new Date(promotion.validTo);

  return (
    promotion.isActive &&
    promotion.promotionType === "food" &&
    validFrom <= now &&
    validTo >= now
  );
}

function getBestMenuItemPromotionDiscount(
  unitPrice: number,
  promotions: any[],
) {
  let bestDiscount = 0;
  for (const promotion of promotions || []) {
    if (!isPromotionActive(promotion)) continue;

    if (promotion.discountPercentage) {
      const discount = (Number(promotion.discountPercentage) / 100) * unitPrice;
      bestDiscount = Math.max(bestDiscount, discount);
    }

    if (promotion.fixedDiscount) {
      bestDiscount = Math.max(bestDiscount, Number(promotion.fixedDiscount));
    }
  }

  return Math.min(bestDiscount, unitPrice);
}

function getActiveMenuItemPromotions(promotions: any[]) {
  return (promotions || []).filter(isPromotionActive);
}

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
  private async getProfileId(): Promise<string> {
    const userId = this.currentUser?.id;
    if (!userId) throw new UnauthorizedError("Cần đăng nhập");

    let profile = await models.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      const user = await models.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      if (!user) throw new NotFoundError("User không tìm thấy");
      profile = await models.profile.create({
        data: {
          userId,
          fullName: `${user.firstName} ${user.lastName}`.trim(),
        },
        select: { id: true },
      });
    }

    return profile.id;
  }

  // ─────────────────────────────────────────────────────────────
  // GET /orders
  // Danh sách đơn hàng của customer đang đăng nhập
  // ─────────────────────────────────────────────────────────────
  async index() {
    const currentProfileId = await this.getProfileId();

    const { status, page, limit } = this.req.query as Record<string, string>;
    const take = parseInt(limit) || 10;
    const skip = (parseInt(page) - 1 || 0) * take;

    const where: Record<string, unknown> = { customerId: currentProfileId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      models.order.findMany({
        where,
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              address: true,
              latitude: true,
              longitude: true,
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
                },
              },
            },
          },
          promotion: {
            select: {
              code: true,
              discountPercentage: true,
              fixedDiscount: true,
            },
          },
          payment: { select: { status: true, method: true, amount: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      models.order.count({ where }),
    ]);

    const ordersWithDeliveryFee = orders.map((order: any) => {
      const deliveryFee =
        Number(order.finalAmount) -
        Number(order.totalAmount) +
        Number(order.discountAmount || 0);
      return {
        ...order,
        deliveryFee: Math.round(deliveryFee),
      };
    });

    this.renderJson({
      items: ordersWithDeliveryFee,
      meta: { total, page: parseInt(page) || 1, limit: take },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // GET /orders/:orderId
  // Chi tiết đơn hàng (customer, restaurant owner, driver)
  // ─────────────────────────────────────────────────────────────
  async show() {
    const { orderId } = this.req.params;
    const currentProfileId = await this.getProfileId();

    const order = await models.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            ownerId: true,
            latitude: true,
            longitude: true,
          },
        },
        customer: { select: { id: true, fullName: true, phone: true } },
        driver: {
          select: {
            id: true,
            vehicleInfo: true,
            licensePlate: true,
            rating: true,
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

    const isCustomer = order.customerId === currentProfileId;
    const isOwner = order.restaurant.ownerId === currentProfileId;
    const isDriver = order.driverId === currentProfileId;

    if (!isCustomer && !isOwner && !isDriver) {
      throw new UnauthorizedError("Bạn không có quyền xem đơn hàng này");
    }

    const deliveryFee =
      Number(order.finalAmount) -
      Number(order.totalAmount) +
      Number(order.discountAmount || 0);
    this.renderJson({
      ...order,
      deliveryFee: Math.round(deliveryFee),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // POST /orders
  // Khách hàng tạo đơn hàng mới
  // ─────────────────────────────────────────────────────────────
  async create() {
    const currentProfileId = await this.getProfileId();

    const data = await this.params(CreateOrderValidator).permit(
      "restaurantId",
      "orderType",
      "items",
      "deliveryAddress",
      "deliveryLatitude",
      "deliveryLongitude",
      "customerPhone",
      "promotionCode",
      "note",
      "tableNumber",
      "reservationTime",
      "paymentMethod",
      "paymentProvider"

    );

    if (!data.items || data.items.length === 0) {
      return this.renderJson(
        { success: false, message: "Giỏ hàng trống" },
        400,
      );
    }

    // Kiểm tra nhà hàng tồn tại & đang hoạt động
    const restaurant = await models.restaurant.findUnique({
      where: { id: data.restaurantId },
    });
    if (!restaurant) throw new NotFoundError("Nhà hàng không tìm thấy");
    if (!restaurant.isActive) {
      return this.renderJson(
        { success: false, message: "Nhà hàng hiện không hoạt động" },
        400,
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
      include: {
        appliedPromotions: true,
      },
    });

    const uniqueMenuItemIds = Array.from(new Set(menuItemIds));
    if (menuItems.length !== uniqueMenuItemIds.length) {
      return this.renderJson(
        {
          success: false,
          message: "Một hoặc nhiều món ăn không hợp lệ hoặc không có sẵn",
        },
        400,
      );
    }

    type MenuItemRow = (typeof menuItems)[number];
    const menuItemMap = new Map<string, MenuItemRow>(
      menuItems.map((m: any) => [m.id, m]),
    );

    // Tính tổng tiền và áp dụng khuyến mãi Flash Sale cho từng món
    let totalAmount = 0;
    let itemLevelDiscount = 0;
    let orderLevelDiscount = 0;

    const orderItemsData = (data.items as any[]).map((item: any) => {
      const menuItem = menuItemMap.get(item.menuItemId)!;
      let optionTotal = 0;
      if (item.selectedOptions && typeof item.selectedOptions === "object") {
        const options = item.selectedOptions as Record<string, any>;
        for (const key of Object.keys(options)) {
          const optionValue = options[key];
          if (Array.isArray(optionValue)) {
            for (const choice of optionValue) {
              if (
                choice &&
                typeof choice === "object" &&
                choice.additionalPrice
              ) {
                optionTotal += Number(choice.additionalPrice);
              }
            }
          } else if (
            optionValue &&
            typeof optionValue === "object" &&
            optionValue.additionalPrice
          ) {
            optionTotal += Number(optionValue.additionalPrice);
          }
        }
      }

      const originalUnitPrice = Number(menuItem.basePrice) + optionTotal;
      const itemPromotionDiscount = getBestMenuItemPromotionDiscount(
        originalUnitPrice,
        menuItem.appliedPromotions || [],
      );
      const discountedUnitPrice = Math.max(
        0,
        originalUnitPrice - itemPromotionDiscount,
      );

      totalAmount += originalUnitPrice * item.quantity;
      itemLevelDiscount += itemPromotionDiscount * item.quantity;

      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: discountedUnitPrice,
        selectedOptions: item.selectedOptions ?? {},
        note: item.note ?? null,
      };
    });

    // Tính phí giao hàng (delivery fee) trước
    let deliveryFee = 0;
    const isDineIn = data.orderType === "dine_in";
    if (!isDineIn) {
      let restLat = restaurant.latitude ? Number(restaurant.latitude) : null;
      let restLon = restaurant.longitude ? Number(restaurant.longitude) : null;
      if (restLat === null || restLon === null) {
        const rCoords = getStableCoords(
          restaurant.id,
          restaurant.address || restaurant.name,
        );
        restLat = rCoords.latitude;
        restLon = rCoords.longitude;
      }

      let delivLat = data.deliveryLatitude
        ? Number(data.deliveryLatitude)
        : null;
      let delivLon = data.deliveryLongitude
        ? Number(data.deliveryLongitude)
        : null;
      if (delivLat === null || delivLon === null) {
        const dCoords = getStableCoords(
          "delivery",
          data.deliveryAddress || "Da Nang",
        );
        delivLat = dCoords.latitude;
        delivLon = dCoords.longitude;
      }

      const distance = calculateDistance(restLat, restLon, delivLat, delivLon);
      deliveryFee = calculateDeliveryFee(distance);
    }

    // Xử lý mã khuyến mãi sau khi có deliveryFee
    let promotionId: string | null = null;
    let promotionType = "food";

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
          {
            success: false,
            message: "Mã khuyến mãi không hợp lệ hoặc đã hết hạn",
          },
          400,
        );
      }

      const minOrder = Number(promo.minOrderValue ?? 0);
      if (totalAmount < minOrder) {
        return this.renderJson(
          {
            success: false,
            message: `Đơn hàng tối thiểu ${minOrder.toLocaleString("vi-VN")}đ để dùng mã này`,
          },
          400,
        );
      }

      promotionId = promo.id;
      promotionType = promo.promotionType;
      if (promo.promotionType === "shipping") {
        if (promo.discountPercentage) {
          orderLevelDiscount =
            (deliveryFee * Number(promo.discountPercentage)) / 100;
        } else if (promo.fixedDiscount) {
          orderLevelDiscount = Math.min(
            Number(promo.fixedDiscount),
            deliveryFee,
          );
        }
      } else {
        if (promo.discountPercentage) {
          orderLevelDiscount =
            (totalAmount * Number(promo.discountPercentage)) / 100;
        } else if (promo.fixedDiscount) {
          orderLevelDiscount = Math.min(
            Number(promo.fixedDiscount),
            totalAmount,
          );
        }
      }
    }

    const discountAmount = itemLevelDiscount + orderLevelDiscount;
    const finalAmount = Math.max(0, totalAmount - discountAmount + deliveryFee);
    const rate = restaurant.commissionRate
      ? Number(restaurant.commissionRate) / 100
      : 0.1;
    const foodDiscount =
      promotionType === "shipping" ? itemLevelDiscount : discountAmount;
    const foodTotalAfterDiscount = Math.max(0, totalAmount - foodDiscount);
    const platformFee = foodTotalAfterDiscount * rate;
    const restaurantNet = foodTotalAfterDiscount - platformFee;

    // Determine payment details
    const methodInput = (data.paymentMethod as any) || "cash";
    const providerInput = (data.paymentProvider as any) || null;

    let paymentCode: string | null = null;
    let paymentUrl: string | null = null;

    if (methodInput !== "cash" && providerInput === "vnpay") {
      paymentCode = `${dayjs().format("YYMMDD")}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const { VNPayService } = require("@services/vnpay.service");
      const vnpayService = new VNPayService();

      let clientIp = this.req.ip || this.req.socket.remoteAddress || "127.0.0.1";
      if (clientIp === "::1" || clientIp === "::ffff:127.0.0.1") {
        clientIp = "127.0.0.1";
      }

      paymentUrl = vnpayService.createPaymentUrl(
        clientIp,
        paymentCode,
        finalAmount
      );
    }

    // Tạo Order + OrderItems trong một transaction

    const order = await models.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const newOrder = await tx.order.create({
          data: {
            customerId: currentProfileId,
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
            deliveryLatitude: data.deliveryLatitude
              ? new Prisma.Decimal(data.deliveryLatitude)
              : null,
            deliveryLongitude: data.deliveryLongitude
              ? new Prisma.Decimal(data.deliveryLongitude)
              : null,
            customerPhone: data.customerPhone ?? null,
            note: data.note ?? null,
            tableNumber: data.tableNumber ?? null,
            reservationTime: data.reservationTime
              ? new Date(data.reservationTime as string)
              : null,
            deviceIp: (this.req.ip ?? null) as string | null,
            orderItems: {
              create: orderItemsData.map((oi) => ({
                ...oi,
                unitPrice: new Prisma.Decimal(oi.unitPrice),
              })),
            },
            payment: {
              create: [{
                method: methodInput,
                provider: providerInput,
                status: "pending",
                amount: finalAmount,
                paymentCode: paymentCode,
                paymentUrl: paymentUrl,
              }]
            }
          },
          include: {
            orderItems: {
              include: {
                menuItem: { select: { id: true, name: true, imageUrl: true } },
              },
            },
            restaurant: { select: { id: true, name: true } },
            promotion: { select: { code: true } },
            payment: true,
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
      },
    );

    const createdOrderWithFee = {
      ...order,
      deliveryFee: Math.round(deliveryFee),
      paymentUrl: order.payment?.[0]?.paymentUrl || null,
    };

    this.renderJson(createdOrderWithFee, 201);
  }

  // ─────────────────────────────────────────────────────────────
  // PATCH /orders/:orderId/status
  // Restaurant owner / driver cập nhật trạng thái đơn hàng
  // ─────────────────────────────────────────────────────────────
  async updateStatus() {
    const { orderId } = this.req.params;
    const currentProfileId = await this.getProfileId();

    const data = await this.params(UpdateOrderStatusValidator).permit(
      "status",
      "note",
    );
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
        400,
      );
    }

    // Kiểm tra quyền
    const isOwner = order.restaurant.ownerId === currentProfileId;
    const isDriver = order.driverId === currentProfileId;

    const restaurantStatuses = ["accepted", "preparing", "ready", "cancelled"];
    const driverStatuses = ["delivering", "completed"];

    if (restaurantStatuses.includes(newStatus) && !isOwner) {
      throw new UnauthorizedError(
        "Chỉ chủ nhà hàng mới có thể cập nhật trạng thái này",
      );
    }
    if (driverStatuses.includes(newStatus) && !isDriver) {
      throw new UnauthorizedError(
        "Chỉ tài xế mới có thể cập nhật trạng thái này",
      );
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

    const io = (this.req as any).app?.get("io");
    if (io) {
      // Phát sự kiện cập nhật trạng thái đơn hàng realtime cho Customer
      io.to(`order:${orderId}`).emit("tracking:status", {
        status: newStatus,
        timestamp: new Date().toISOString(),
      });
      
      // Phát sự kiện đến restaurant owner và admin
      io.to(`restaurant:${order.restaurantId}`).emit("order:status_changed", { orderId, status: newStatus });
      io.to("admin").emit("order:status_changed", { orderId, status: newStatus });
      
      // Phát sự kiện cập nhật đến tài xế đang online, để UI tài xế tự refresh danh sách
      io.to("drivers:available").emit("order:status_changed", { orderId, status: newStatus });
      if (order.driverId) {
        io.to(`driver:${order.driverId}`).emit("order:status_changed", { orderId, status: newStatus });
      }
    }

    // Khi nhà hàng nhận đơn (accepted), tìm tài xế phù hợp
    if (newStatus === "accepted") {
      const {
        DriverAssignmentService,
      } = require("@services/driverAssignment.service");
      new DriverAssignmentService()
        .triggerAssignment(orderId)
        .catch(console.error);
    }

    if (newStatus === "cancelled" && order.driverId) {
      if (io) {
        io.to(`driver:${order.driverId}`).emit("driver:order_cancelled", {
          orderId,
          message: "Đơn hàng đã bị huỷ",
        });
      }
      await models.driverProfile.update({
        where: { id: order.driverId },
        data: { currentStatus: "online" },
      });
    }

    if (newStatus === "completed") {
      const { GamificationService } = require("@services/gamification.service");
      GamificationService.rewardOrderPoints(orderId).catch((err: any) =>
        console.error("Error rewarding points:", err)
      );
    }

    this.renderJson(updatedOrder);
  }

  // ─────────────────────────────────────────────────────────────
  // PATCH /orders/:orderId/cancel
  // Khách hàng huỷ đơn (chỉ khi trạng thái "pending")
  // ─────────────────────────────────────────────────────────────
  async cancel() {
    const { orderId } = this.req.params;
    const currentProfileId = await this.getProfileId();

    const data = await this.params(CancelOrderValidator).permit("reason");

    const order = await models.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("Đơn hàng không tìm thấy");

    if (order.customerId !== currentProfileId) {
      throw new UnauthorizedError("Bạn không có quyền huỷ đơn hàng này");
    }

    if (order.status !== "pending") {
      return this.renderJson(
        {
          success: false,
          message: "Chỉ có thể huỷ khi đơn hàng đang ở trạng thái chờ xác nhận",
        },
        400,
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

    this.renderJson(cancelledOrder);
  }

  // ─────────────────────────────────────────────────────────────
  // GET /restaurants/:restaurantId/orders
  // Restaurant owner xem danh sách đơn của nhà hàng mình
  // ─────────────────────────────────────────────────────────────
  async restaurantOrders() {
    const { restaurantId } = this.req.params;
    const currentProfileId = await this.getProfileId();

    const restaurant = await models.restaurant.findUnique({
      where: { id: restaurantId },
      select: { ownerId: true },
    });
    if (!restaurant) throw new NotFoundError("Nhà hàng không tìm thấy");
    if (restaurant.ownerId !== currentProfileId) {
      throw new UnauthorizedError(
        "Bạn không có quyền xem đơn hàng của nhà hàng này",
      );
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

    const ordersWithDeliveryFee = orders.map((order: any) => {
      const deliveryFee =
        Number(order.finalAmount) -
        Number(order.totalAmount) +
        Number(order.discountAmount || 0);
      return {
        ...order,
        deliveryFee: Math.round(deliveryFee),
      };
    });

    this.renderJson({
      items: ordersWithDeliveryFee,
      meta: { total, page: parseInt(page) || 1, limit: take },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // GET /orders/:orderId/history
  // Lịch sử thay đổi trạng thái đơn hàng
  // ─────────────────────────────────────────────────────────────
  async statusHistory() {
    const { orderId } = this.req.params;
    const currentProfileId = await this.getProfileId();

    const order = await models.order.findUnique({
      where: { id: orderId },
      include: {
        orderStatusHistories: { orderBy: { createdAt: "asc" } },
        restaurant: { select: { ownerId: true } },
      },
    });
    if (!order) throw new NotFoundError("Đơn hàng không tìm thấy");

    const isCustomer = order.customerId === currentProfileId;
    const isOwner = order.restaurant.ownerId === currentProfileId;
    const isDriver = order.driverId === currentProfileId;

    if (!isCustomer && !isOwner && !isDriver) {
      throw new UnauthorizedError("Bạn không có quyền xem đơn hàng này");
    }

    this.renderJson(order.orderStatusHistories);
  }

  // ─────────────────────────────────────────────────────────────
  // POST /orders/check-promotion
  // Kiểm tra mã giảm giá
  // ─────────────────────────────────────────────────────────────
  async checkPromotion() {
    const data = this.req.body;
    const { promotionCode, restaurantId, totalAmount, deliveryFee } = data;

    if (!promotionCode || !totalAmount) {
      return this.renderJson(
        {
          success: false,
          message: "Thiếu thông tin (promotionCode, totalAmount)",
        },
        400,
      );
    }

    const promo = await models.promotion.findFirst({
      where: {
        code: promotionCode,
        isActive: true,
        validFrom: { lte: new Date() },
        validTo: { gte: new Date() },
        OR: [{ restaurantId: restaurantId || null }, { restaurantId: null }],
      },
    });

    if (!promo) {
      return this.renderJson(
        {
          success: false,
          message: "Mã khuyến mãi không hợp lệ hoặc đã hết hạn",
        },
        400,
      );
    }

    const minOrder = Number(promo.minOrderValue ?? 0);
    if (totalAmount < minOrder) {
      return this.renderJson(
        {
          success: false,
          message: `Đơn hàng tối thiểu ${minOrder.toLocaleString("vi-VN")}đ để dùng mã này`,
        },
        400,
      );
    }

    let discountAmount = 0;
    if (promo.promotionType === "shipping") {
      const fee = Number(deliveryFee ?? 0);
      if (promo.discountPercentage) {
        discountAmount = (fee * Number(promo.discountPercentage)) / 100;
      } else if (promo.fixedDiscount) {
        discountAmount = Math.min(Number(promo.fixedDiscount), fee);
      }
    } else {
      if (promo.discountPercentage) {
        discountAmount =
          (Number(totalAmount) * Number(promo.discountPercentage)) / 100;
      } else if (promo.fixedDiscount) {
        discountAmount = Math.min(
          Number(promo.fixedDiscount),
          Number(totalAmount),
        );
      }
    }

    return this.renderJson({
      discountAmount: Math.round(discountAmount),
      promotionCode: promo.code,
      promotionType: promo.promotionType,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // GET /promotions
  // Lấy danh sách mã giảm giá hoạt động
  // ─────────────────────────────────────────────────────────────
  async getPromotions() {
    const { restaurantId } = this.req.query as Record<string, string>;

    const promotions = await models.promotion.findMany({
      where: {
        isActive: true,
        validFrom: { lte: new Date() },
        validTo: { gte: new Date() },
        OR: [
          restaurantId ? { restaurantId } : null,
          { restaurantId: null },
        ].filter(Boolean) as any,
      },
    });

    this.renderJson(promotions);
  }

  // ─────────────────────────────────────────────────────────────
  // POST /orders/:orderId/review
  // Khách hàng đánh giá nhà hàng & tài xế sau khi đơn hoàn thành
  // ─────────────────────────────────────────────────────────────
  async createReview() {
    const { orderId } = this.req.params;
    const currentProfileId = await this.getProfileId();

    const data = await this.params(CreateReviewValidator).permit(
      "restaurantRating",
      "restaurantComment",
      "driverRating",
      "driverComment",
    );

    const order = await models.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: true,
        driver: true,
      },
    });

    if (!order) throw new NotFoundError("Đơn hàng không tìm thấy");

    if (order.customerId !== currentProfileId) {
      throw new UnauthorizedError("Bạn không có quyền đánh giá đơn hàng này");
    }

    if (order.status !== "completed") {
      return this.renderJson(
        {
          success: false,
          message: "Chỉ có thể đánh giá khi đơn hàng đã hoàn thành",
        },
        400,
      );
    }

    const existingRestaurantReview = await models.restaurantReview.findFirst({
      where: {
        orderId: order.id,
        reviewerId: currentProfileId,
      },
    });

    if (existingRestaurantReview) {
      return this.renderJson(
        {
          success: false,
          message: "Bạn đã đánh giá đơn hàng này rồi",
        },
        400,
      );
    }

    const result = await models.$transaction(
      async (tx: Prisma.TransactionClient) => {
        let restaurantReview = null;
        let driverReview = null;

        if (data.restaurantRating) {
          restaurantReview = await tx.restaurantReview.create({
            data: {
              orderId: order.id,
              reviewerId: currentProfileId,
              restaurantId: order.restaurantId,
              rating: data.restaurantRating,
              comment: data.restaurantComment || null,
            },
          });

          const aggregate = await tx.restaurantReview.aggregate({
            where: { restaurantId: order.restaurantId },
            _avg: { rating: true },
          });
          const newRating = parseFloat((aggregate._avg.rating || 0).toFixed(2));

          await tx.restaurant.update({
            where: { id: order.restaurantId },
            data: { rating: new Prisma.Decimal(newRating) },
          });
        }

        if (order.driverId && data.driverRating) {
          const existingDriverReview = await tx.driverReview.findUnique({
            where: {
              reviewerId_driverId: {
                reviewerId: currentProfileId,
                driverId: order.driverId,
              },
            },
          });

          if (existingDriverReview) {
            driverReview = await tx.driverReview.update({
              where: { id: existingDriverReview.id },
              data: {
                rating: data.driverRating,
                comment: data.driverComment || null,
              },
            });
          } else {
            driverReview = await tx.driverReview.create({
              data: {
                reviewerId: currentProfileId,
                driverId: order.driverId,
                rating: data.driverRating,
                comment: data.driverComment || null,
              },
            });
          }

          const aggregate = await tx.driverReview.aggregate({
            where: { driverId: order.driverId },
            _avg: { rating: true },
          });
          const newRating = parseFloat((aggregate._avg.rating || 0).toFixed(2));

          await tx.driverProfile.update({
            where: { id: order.driverId },
            data: { rating: new Prisma.Decimal(newRating) },
          });
        }

        return { restaurantReview, driverReview };
      },
    );

    this.renderJson({
      success: true,
      message: "Đánh giá thành công",
      data: result,
    });
  }
}
