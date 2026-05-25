import models from "@models";
import { NotFoundError } from "ts-rails";

export class DriverLocationService {
  /**
   * 5.1 Cập nhật vị trí tài xế real-time
   */
  async updateLocation(profileId: string, latitude: number, longitude: number) {
    const existing = await models.driverLocation.findUnique({ where: { driverId: profileId } });

    let location;
    if (existing) {
      location = await models.driverLocation.update({
        where: { driverId: profileId },
        data: { latitude, longitude },
      });
    } else {
      location = await models.driverLocation.create({
        data: { driverId: profileId, latitude, longitude },
      });
    }

    return location;
  }

  /**
   * 5.1 Lấy vị trí hiện tại của tài xế (để hiển thị bản đồ cho khách)
   */
  async getLocation(profileId: string) {
    const location = await models.driverLocation.findUnique({
      where: { driverId: profileId },
      include: { driver: { select: { currentStatus: true } } },
    });
    if (!location) throw new NotFoundError("Không tìm thấy vị trí tài xế");
    return location;
  }

  /**
   * 5.1 Lấy bản đồ nhiệt (Demand Heatmap) - vị trí các đơn hàng đang chờ
   * Trả về tọa độ nhà hàng của những đơn đang chờ tài xế
   */
  async getDemandHeatmap() {
    type PendingOrder = {
      restaurant: {
        latitude: number | null;
        longitude: number | null;
        name: string;
        address: string;
      };
    };

    const pendingOrders: PendingOrder[] = await models.order.findMany({
      where: {
        status: "ready",
        driverId: null,
      },
      select: {
        restaurant: {
          select: { latitude: true, longitude: true, name: true, address: true },
        },
      },
    });

    // Gộp theo tọa độ nhà hàng
    const heatmap = pendingOrders
      .filter((o) => o.restaurant.latitude != null && o.restaurant.longitude != null)
      .map((o) => ({
        latitude: Number(o.restaurant.latitude),
        longitude: Number(o.restaurant.longitude),
        name: o.restaurant.name,
        address: o.restaurant.address,
        weight: 1,
      }));

    return heatmap;
  }

  /**
   * 5.1 Tối ưu hóa lộ trình - Route Optimization (Gom đơn)
   * Sắp xếp các đơn theo thứ tự tối ưu nhất dựa trên tọa độ tài xế hiện tại
   * Thuật toán Nearest Neighbor (greedy TSP)
   */
  async optimizeRoute(profileId: string, orderIds?: string[]) {
    // Lấy vị trí hiện tại tài xế
    const driverLoc = await models.driverLocation.findUnique({
      where: { driverId: profileId },
    });
    if (!driverLoc) throw new NotFoundError("Vui lòng bật định vị trước khi tối ưu lộ trình");

    // Lấy các đơn cần giao
    const whereClause: any = {
      driverId: profileId,
      status: { in: ["accepted", "delivering"] },
    };
    if (orderIds && orderIds.length > 0) {
      whereClause.id = { in: orderIds };
    }

    type RouteOrder = {
      id: string;
      deliveryAddress?: string | null;
      restaurant: {
        name: string;
        address: string;
        latitude: number | null;
        longitude: number | null;
      };
      customer: {
        fullName: string;
        phone: string | null;
      } | null;
    };

    const orders: RouteOrder[] = await models.order.findMany({
      where: whereClause,
      include: {
        restaurant: { select: { name: true, address: true, latitude: true, longitude: true } },
        customer: { select: { fullName: true, phone: true } },
      },
    });

    if (orders.length === 0) {
      return { message: "Không có đơn nào để tối ưu lộ trình", route: [] };
    }

    // Nearest Neighbor algorithm
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // km
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // Điểm dừng gồm: điểm đến nhà hàng (lấy hàng) + địa chỉ giao khách
    // Đơn giản hóa: chỉ dùng tọa độ nhà hàng cho mỗi đơn
    let remaining = [...orders];
    const sorted: typeof orders = [];
    let curLat = Number(driverLoc.latitude);
    let curLng = Number(driverLoc.longitude);

    while (remaining.length > 0) {
      let nearest = -1;
      let minDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const r = remaining[i].restaurant;
        if (r.latitude == null || r.longitude == null) continue;
        const d = haversine(curLat, curLng, Number(r.latitude), Number(r.longitude));
        if (d < minDist) {
          minDist = d;
          nearest = i;
        }
      }
      if (nearest === -1) {
        sorted.push(...remaining);
        break;
      }
      const chosen = remaining.splice(nearest, 1)[0];
      sorted.push(chosen);
      curLat = Number(chosen.restaurant.latitude ?? curLat);
      curLng = Number(chosen.restaurant.longitude ?? curLng);
    }

    // Lưu thứ tự vào deliverySequence
    await Promise.all(
      sorted.map((order, idx) =>
        models.order.update({
          where: { id: order.id },
          data: { deliverySequence: idx + 1 },
        })
      )
    );

    const route = sorted.map((order, idx) => ({
      sequence: idx + 1,
      orderId: order.id,
      restaurant: {
        name: order.restaurant.name,
        address: order.restaurant.address,
        latitude: Number(order.restaurant.latitude),
        longitude: Number(order.restaurant.longitude),
      },
      customer: {
        name: order.customer?.fullName,
        phone: order.customer?.phone,
        address: (order as any).deliveryAddress,
      },
    }));

    return { message: "Đã tối ưu lộ trình", driverLocation: driverLoc, route };
  }
}
