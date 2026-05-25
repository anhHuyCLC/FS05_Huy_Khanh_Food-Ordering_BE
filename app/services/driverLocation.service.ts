import models from "@models";
import { NotFoundError } from "ts-rails";

type PendingOrder = {
  restaurant: {
    latitude: number | null;
    longitude: number | null;
    name: string;
    address: string;
  };
};

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

export class DriverLocationService {
  /**
   * 5.1 Cập nhật vị trí tài xế real-time
   */
  async updateLocation(
    profileId: string,
    latitude: number,
    longitude: number
  ) {
    const existing = await models.driverLocation.findUnique({
      where: { driverId: profileId },
    });

    let location;

    if (existing) {
      location = await models.driverLocation.update({
        where: { driverId: profileId },
        data: { latitude, longitude },
      });
    } else {
      location = await models.driverLocation.create({
        data: {
          driverId: profileId,
          latitude,
          longitude,
        },
      });
    }

    return location;
  }

  /**
   * 5.1 Lấy vị trí hiện tại của tài xế
   */
  async getLocation(profileId: string) {
    const location = await models.driverLocation.findUnique({
      where: { driverId: profileId },
      include: {
        driver: {
          select: {
            currentStatus: true,
          },
        },
      },
    });

    if (!location) {
      throw new NotFoundError("Không tìm thấy vị trí tài xế");
    }

    return location;
  }

  /**
   * 5.1 Demand Heatmap
   * Trả về tọa độ nhà hàng của đơn đang chờ shipper
   */
  async getDemandHeatmap() {
    const rawOrders = await models.order.findMany({
      where: {
        status: "ready",
        driverId: null,
      },
      select: {
        restaurant: {
          select: {
            latitude: true,
            longitude: true,
            name: true,
            address: true,
          },
        },
      },
    });

    const pendingOrders: PendingOrder[] = rawOrders.map((order) => ({
      restaurant: {
        name: order.restaurant.name,
        address: order.restaurant.address,
        latitude:
          order.restaurant.latitude?.toNumber() ?? null,
        longitude:
          order.restaurant.longitude?.toNumber() ?? null,
      },
    }));

    const heatmap = pendingOrders
      .filter(
        (o) =>
          o.restaurant.latitude != null &&
          o.restaurant.longitude != null
      )
      .map((o) => ({
        latitude: o.restaurant.latitude!,
        longitude: o.restaurant.longitude!,
        name: o.restaurant.name,
        address: o.restaurant.address,
        weight: 1,
      }));

    return heatmap;
  }

  /**
   * 5.1 Route Optimization
   * Thuật toán Nearest Neighbor
   */
  async optimizeRoute(
    profileId: string,
    orderIds?: string[]
  ) {
    // Lấy vị trí hiện tại của tài xế
    const driverLoc = await models.driverLocation.findUnique({
      where: {
        driverId: profileId,
      },
    });

    if (!driverLoc) {
      throw new NotFoundError(
        "Vui lòng bật định vị trước khi tối ưu lộ trình"
      );
    }

    // Điều kiện query
    const whereClause: any = {
      driverId: profileId,
      status: {
        in: ["accepted", "delivering"],
      },
    };

    if (orderIds?.length) {
      whereClause.id = {
        in: orderIds,
      };
    }

    const rawOrders = await models.order.findMany({
      where: whereClause,
      include: {
        restaurant: {
          select: {
            name: true,
            address: true,
            latitude: true,
            longitude: true,
          },
        },
        customer: {
          select: {
            fullName: true,
            phone: true,
          },
        },
      },
    });

    const orders: RouteOrder[] = rawOrders.map((order) => ({
      ...order,
      restaurant: {
        name: order.restaurant.name,
        address: order.restaurant.address,
        latitude:
          order.restaurant.latitude?.toNumber() ?? null,
        longitude:
          order.restaurant.longitude?.toNumber() ?? null,
      },
    }));

    if (orders.length === 0) {
      return {
        message: "Không có đơn nào để tối ưu lộ trình",
        route: [],
      };
    }

    // Haversine distance
    const toRad = (deg: number) =>
      (deg * Math.PI) / 180;

    const haversine = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number
    ) => {
      const R = 6371;

      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) ** 2;

      return (
        R *
        2 *
        Math.atan2(
          Math.sqrt(a),
          Math.sqrt(1 - a)
        )
      );
    };

    // Nearest Neighbor
    let remaining = [...orders];
    const sorted: RouteOrder[] = [];

    let curLat = Number(driverLoc.latitude);
    let curLng = Number(driverLoc.longitude);

    while (remaining.length > 0) {
      let nearestIndex = -1;
      let minDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const restaurant =
          remaining[i].restaurant;

        if (
          restaurant.latitude == null ||
          restaurant.longitude == null
        ) {
          continue;
        }

        const distance = haversine(
          curLat,
          curLng,
          restaurant.latitude,
          restaurant.longitude
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }

      if (nearestIndex === -1) {
        sorted.push(...remaining);
        break;
      }

      const chosen = remaining.splice(
        nearestIndex,
        1
      )[0];

      sorted.push(chosen);

      curLat =
        chosen.restaurant.latitude ?? curLat;

      curLng =
        chosen.restaurant.longitude ?? curLng;
    }

    // Lưu thứ tự giao hàng
    await Promise.all(
      sorted.map((order, index) =>
        models.order.update({
          where: {
            id: order.id,
          },
          data: {
            deliverySequence: index + 1,
          },
        })
      )
    );

    const route = sorted.map(
      (order, index) => ({
        sequence: index + 1,
        orderId: order.id,

        restaurant: {
          name: order.restaurant.name,
          address: order.restaurant.address,
          latitude:
            order.restaurant.latitude,
          longitude:
            order.restaurant.longitude,
        },

        customer: {
          name:
            order.customer?.fullName ??
            null,
          phone:
            order.customer?.phone ??
            null,
          address:
            order.deliveryAddress ??
            null,
        },
      })
    );

    return {
      message: "Đã tối ưu lộ trình",
      driverLocation: driverLoc,
      route,
    };
  }
}