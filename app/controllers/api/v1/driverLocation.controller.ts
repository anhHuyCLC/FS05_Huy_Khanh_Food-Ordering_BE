// ============================================================
// app/controllers/api/v1/driver/driverLocation.controller.ts
// ============================================================
import { ApiV1Controller } from "..";
import { DriverLocationService } from "@services/driverLocation.service";
import {
  RouteOptimizationValidator,
  UpdateLocationValidator,
} from "@validators/driver.validator";

export class DriverLocationController extends ApiV1Controller {
  private service = new DriverLocationService();

  /** PATCH /api/v1/driver/location */
  async updateLocation() {
    const profileId = (this.req as any).driverProfileId as string;
    const { latitude, longitude } = await this.params(UpdateLocationValidator).permit(
      "latitude",
      "longitude"
    );

    const result = await this.service.updateLocation(profileId, latitude!, longitude!);

    // Broadcast vị trí qua WebSocket đến các đơn đang active
    try {
      const io = (this.req as any).app?.get("io");
      if (io) {
        const models = this.models;
        const activeOrders = await models.order.findMany({
          where: { driverId: profileId, status: { in: ["accepted", "preparing", "ready", "delivering"] } },
          select: { id: true },
        });
        for (const order of activeOrders) {
          io.to(`order:${order.id}`).emit("tracking:location", {
            driverId: profileId,
            lat: latitude,
            lng: longitude,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (_) {}

    this.renderJson({ success: true, data: result });
    console.log(result);
  }

  /** GET /api/v1/driver/location */
  async getLocation() {
    const profileId = (this.req as any).driverProfileId as string;
    const result = await this.service.getLocation(profileId);
    this.renderJson({ success: true, data: result });
  }

  /** GET /api/v1/driver/location/:driverId — public, dành cho khách theo dõi */
  async getDriverLocation() {
    const driverId = this.req.params.driverId;
    const result = await this.service.getLocation(driverId);
    this.renderJson({ success: true, data: result });
  }

  /** GET /api/v1/driver/heatmap */
  async heatmap() {
    const result = await this.service.getDemandHeatmap();
    this.renderJson({ success: true, data: result, count: result.length });
  }

  /** POST /api/v1/driver/route-optimize */
  async routeOptimize() {
    const profileId = (this.req as any).driverProfileId as string;
    const { orderIds } = await this.params(RouteOptimizationValidator).permit("orderIds");
    const result = await this.service.optimizeRoute(profileId, orderIds);
    this.renderJson({ success: true, data: result });
  }
}
