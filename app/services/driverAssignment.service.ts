import models from "@models";
import application from "@configs/application";
import { Prisma } from "@db";

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

function getStableCoords(id: string, text: string): { latitude: number; longitude: number } {
  const input = `${id}-${text}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const lat = 16.054404 + ((hash % 100) / 1000);
  const lon = 108.202167 + (((hash >> 2) % 100) / 1000);
  return { latitude: lat, longitude: lon };
}

export class DriverAssignmentService {
  /**
   * Khởi chạy tìm kiếm tài xế và bắt đầu phân phối tuần tự
   */
  async triggerAssignment(orderId: string) {
    console.log(`[DriverAssignmentService] Starting assignment for order ${orderId}`);
    const order = await models.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: true,
        orderItems: {
          include: { menuItem: { select: { name: true } } },
        },
      },
    });

    if (!order) {
      console.warn(`[DriverAssignmentService] Order ${orderId} not found`);
      return;
    }

    // 1. Xác định tọa độ nhà hàng
    let restLat = order.restaurant.latitude ? Number(order.restaurant.latitude) : null;
    let restLon = order.restaurant.longitude ? Number(order.restaurant.longitude) : null;
    if (restLat === null || restLon === null) {
      const rCoords = getStableCoords(order.restaurant.id, order.restaurant.address || order.restaurant.name);
      restLat = rCoords.latitude;
      restLon = rCoords.longitude;
    }

    // 2. Tìm tất cả tài xế đang online & đã duyệt
    const onlineDrivers = await models.driverProfile.findMany({
      where: {
        currentStatus: "online",
        approvalStatus: "APPROVED",
      },
      include: {
        locations: true,
      },
    });

    console.log(`[DriverAssignmentService] Found ${onlineDrivers.length} online drivers`);

    // DEBUG: Log chi tiết từng tài xế
    for (const driver of onlineDrivers) {
      console.log(`[DriverAssignmentService] Driver ${driver.id}: approvalStatus=${driver.approvalStatus}, currentStatus=${driver.currentStatus}, locations count=${driver.locations?.length ?? 0}`);
      if (driver.locations && driver.locations.length > 0) {
        const loc = driver.locations[0];
        console.log(`[DriverAssignmentService]   Location: lat=${loc.latitude}, lng=${loc.longitude}`);
      }
    }

    // DEBUG: Cũng log tất cả tài xế online (không lọc approvalStatus) để so sánh
    const allOnlineDrivers = await models.driverProfile.findMany({
      where: { currentStatus: "online" },
      include: { locations: true },
    });
    console.log(`[DriverAssignmentService] Total online drivers (any approval): ${allOnlineDrivers.length}`);
    for (const d of allOnlineDrivers) {
      console.log(`[DriverAssignmentService]   id=${d.id}, approval=${d.approvalStatus}, status=${d.currentStatus}, hasLocation=${(d.locations?.length ?? 0) > 0}`);
    }

    const driversWithDistance: Array<{ id: string; distance: number }> = [];

    for (const driver of onlineDrivers) {
      const location = driver.locations && driver.locations.length > 0 ? driver.locations[0] : null;
      if (!location) {
        console.log(`[DriverAssignmentService] Driver ${driver.id} skipped: no location`);
        continue;
      }

      const distance = calculateDistance(
        restLat,
        restLon,
        Number(location.latitude),
        Number(location.longitude)
      );

      console.log(`[DriverAssignmentService] Driver ${driver.id} distance: ${distance.toFixed(2)} km (max 5km)`);

      // Bán kính tối đa 5km để giao hàng hiệu quả
      if (distance <= 5.0) {
        driversWithDistance.push({ id: driver.id, distance });
      } else {
        console.log(`[DriverAssignmentService] Driver ${driver.id} skipped: too far (${distance.toFixed(2)} km)`);
      }
    }

    // 3. Sắp xếp tài xế từ gần nhất đến xa nhất
    driversWithDistance.sort((a, b) => a.distance - b.distance);

    if (driversWithDistance.length === 0) {
      console.log(`[DriverAssignmentService] No nearby drivers for order ${orderId}`);
      // Clear assignment fields
      await models.order.update({
        where: { id: orderId },
        data: {
          currentDriverId: null,
          assignmentExpiresAt: null,
          assignmentQueue: [],
        },
      });
      return;
    }

    console.log(`[DriverAssignmentService] Queue for order ${orderId}:`, driversWithDistance);

    // 4. Lấy tài xế đầu tiên và bắt đầu phân phối
    const firstOffer = driversWithDistance.shift()!;
    const remainingQueue = driversWithDistance;

    await models.order.update({
      where: { id: orderId },
      data: {
        currentDriverId: firstOffer.id,
        assignmentExpiresAt: new Date(Date.now() + 30 * 1000), // Offer hết hạn trong 30 giây
        assignmentQueue: remainingQueue as any,
      },
    });

    // 5. Gửi thông báo WebSocket cho tài xế đó
    this.sendOfferNotification(order, firstOffer.id, firstOffer.distance);
  }

  /**
   * Chuyển tiếp đơn hàng cho tài xế tiếp theo trong hàng đợi
   */
  async offerToNextDriver(orderId: string) {
    console.log(`[DriverAssignmentService] Offering to next driver for order ${orderId}`);
    const order = await models.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: true,
        orderItems: {
          include: { menuItem: { select: { name: true } } },
        },
      },
    });

    if (!order) return;

    const queue = (order.assignmentQueue as Array<{ id: string; distance: number }>) || [];

    if (queue.length === 0) {
      console.log(`[DriverAssignmentService] No more drivers in queue for order ${orderId}`);
      // Không còn tài xế nào, trả đơn về trạng thái chờ tự do hoặc thông báo
      await models.order.update({
        where: { id: orderId },
        data: {
          currentDriverId: null,
          assignmentExpiresAt: null,
          assignmentQueue: [],
        },
      });
      return;
    }

    const nextOffer = queue.shift()!;
    const remainingQueue = queue;

    await models.order.update({
      where: { id: orderId },
      data: {
        currentDriverId: nextOffer.id,
        assignmentExpiresAt: new Date(Date.now() + 30 * 1000), // 30s hết hạn
        assignmentQueue: remainingQueue as any,
      },
    });

    this.sendOfferNotification(order, nextOffer.id, nextOffer.distance);
  }

  /**
   * Kiểm tra và xử lý các đơn hàng bị hết hạn offer tài xế (Timeout 30s)
   */
  async checkExpiredAssignments() {
    const expiredOrders = await models.order.findMany({
      where: {
        driverId: null,
        currentDriverId: { not: null },
        assignmentExpiresAt: { lte: new Date() },
      },
    });

    if (expiredOrders.length > 0) {
      console.log(`[DriverAssignmentService] Found ${expiredOrders.length} expired driver offers`);
    }

    for (const order of expiredOrders) {
      console.log(`[DriverAssignmentService] Offer expired for order ${order.id}. Moving to next driver.`);
      await this.offerToNextDriver(order.id);
    }
  }

  /**
   * Helper gửi tin nhắn WebSocket qua room driver
   */
  private sendOfferNotification(order: any, driverId: string, distance: number) {
    const io = application.app?.get("io");
    if (!io) {
      console.warn("[DriverAssignmentService] io instance not found in express app settings");
      return;
    }

    // DEBUG: Kiểm tra room driver có socket nào không
    const room = io.sockets.adapter.rooms.get(`driver:${driverId}`);
    console.log(`[DriverAssignmentService] Room driver:${driverId} has ${room?.size ?? 0} connected sockets`);
    console.log(`[DriverAssignmentService] All rooms:`, Array.from(io.sockets.adapter.rooms.keys() as Iterable<string>).filter((r) => r.startsWith("driver:")));

    console.log(`[DriverAssignmentService] Sending driver:new_order to driver:${driverId}`);
    io.to(`driver:${driverId}`).emit("driver:new_order", {
      orderId: order.id,
      restaurant: {
        name: order.restaurant.name,
        address: order.restaurant.address,
      },
      deliveryAddress: order.deliveryAddress,
      finalAmount: Number(order.finalAmount),
      distance: Math.round(distance * 10) / 10, // Làm tròn 1 chữ số thập phân
      expiresIn: 30000, // 30 giây
      orderItems: order.orderItems,
      createdAt: order.createdAt,
    });
  }
}
