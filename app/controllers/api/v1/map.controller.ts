import { ApiV1Controller } from "./apiV1.controller";
import { MapService } from "@services/map.service";

export class MapControllerV1 extends ApiV1Controller {
  private mapService = new MapService();

  // ─────────────────────────────────────────────────────────────
  // GET /api/v1/maps/autocomplete?q=...
  // ─────────────────────────────────────────────────────────────
  async autocomplete() {
    try {
      const q = (this.req.query.q as string) || "";
      if (!q.trim()) {
        return this.res.status(200).json({
          success: true,
          data: [],
        });
      }

      const results = await this.mapService.autocomplete(q);
      return this.res.status(200).json({
        success: true,
        data: results,
      });
    } catch (error: any) {
      console.error("Autocomplete controller error:", error);
      return this.res.status(500).json({
        success: false,
        message: error.message || "Lỗi xử lý tự động hoàn thành địa chỉ.",
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // GET /api/v1/maps/geocode?lat=...&lon=... OR ?q=...
  // ─────────────────────────────────────────────────────────────
  async geocode() {
    try {
      const { lat, lon, q } = this.req.query;

      if (lat && lon) {
        // Reverse geocoding
        const latitude = parseFloat(lat as string);
        const longitude = parseFloat(lon as string);

        if (isNaN(latitude) || isNaN(longitude)) {
          return this.res.status(400).json({
            success: false,
            message: "Tọa độ không hợp lệ.",
          });
        }

        const address = await this.mapService.reverseGeocode(latitude, longitude);
        return this.res.status(200).json({
          success: true,
          data: { address, latitude, longitude },
        });
      } else if (q) {
        // Forward geocoding (using autocomplete first result)
        const results = await this.mapService.autocomplete(q as string);
        if (results.length > 0) {
          return this.res.status(200).json({
            success: true,
            data: results[0],
          });
        }
        return this.res.status(404).json({
          success: false,
          message: "Không tìm thấy tọa độ cho địa chỉ này.",
        });
      } else {
        return this.res.status(400).json({
          success: false,
          message: "Thiếu tham số truy vấn (yêu cầu lat/lon hoặc q).",
        });
      }
    } catch (error: any) {
      console.error("Geocode controller error:", error);
      return this.res.status(500).json({
        success: false,
        message: error.message || "Lỗi xử lý địa lý bản đồ.",
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // POST /api/v1/maps/route
  // Body: { start: { lat, lon }, end: { lat, lon } } or { startLat, startLon, endLat, endLon }
  // ─────────────────────────────────────────────────────────────
  async route() {
    try {
      const body = this.req.body || {};
      let startLat: number | undefined;
      let startLon: number | undefined;
      let endLat: number | undefined;
      let endLon: number | undefined;

      // Extract coords depending on structural formats
      if (body.start && body.end) {
        if (Array.isArray(body.start) && Array.isArray(body.end)) {
          startLat = body.start[0];
          startLon = body.start[1];
          endLat = body.end[0];
          endLon = body.end[1];
        } else {
          startLat = body.start.lat || body.start.latitude;
          startLon = body.start.lon || body.start.lon || body.start.lng || body.start.longitude;
          endLat = body.end.lat || body.end.latitude;
          endLon = body.end.lon || body.end.lon || body.end.lng || body.end.longitude;
        }
      } else {
        startLat = body.startLat;
        startLon = body.startLon || body.startLng;
        endLat = body.endLat;
        endLon = body.endLon || body.endLng;
      }

      if (
        startLat === undefined ||
        startLon === undefined ||
        endLat === undefined ||
        endLon === undefined ||
        isNaN(Number(startLat)) ||
        isNaN(Number(startLon)) ||
        isNaN(Number(endLat)) ||
        isNaN(Number(endLon))
      ) {
        return this.res.status(400).json({
          success: false,
          message: "Tọa độ điểm bắt đầu hoặc điểm kết thúc không đầy đủ hoặc không hợp lệ.",
        });
      }

      const routeInfo = await this.mapService.getRoute(
        Number(startLat),
        Number(startLon),
        Number(endLat),
        Number(endLon)
      );

      return this.res.status(200).json({
        success: true,
        data: routeInfo,
      });
    } catch (error: any) {
      console.error("Route controller error:", error);
      return this.res.status(500).json({
        success: false,
        message: error.message || "Lỗi tính toán đường đi giao hàng.",
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // GET /api/v1/maps/distance?startLat=...&startLon=...&endLat=...&endLon=...
  // ─────────────────────────────────────────────────────────────
  async distance() {
    try {
      const { startLat, startLon, endLat, endLon } = this.req.query;

      if (!startLat || !startLon || !endLat || !endLon) {
        return this.res.status(400).json({
          success: false,
          message: "Thiếu tọa độ điểm đầu hoặc điểm cuối.",
        });
      }

      const sLat = parseFloat(startLat as string);
      const sLon = parseFloat(startLon as string);
      const eLat = parseFloat(endLat as string);
      const eLon = parseFloat(endLon as string);

      if (isNaN(sLat) || isNaN(sLon) || isNaN(eLat) || isNaN(eLon)) {
        return this.res.status(400).json({
          success: false,
          message: "Tọa độ không đúng định dạng số.",
        });
      }

      // We call the route calculation which also computes exact road distance if possible,
      // or falls back to Haversine.
      const routeInfo = await this.mapService.getRoute(sLat, sLon, eLat, eLon);

      return this.res.status(200).json({
        success: true,
        data: {
          distance: routeInfo.distance, // in meters
          duration: routeInfo.duration, // in seconds
          shippingFee: routeInfo.shippingFee,
        },
      });
    } catch (error: any) {
      console.error("Distance controller error:", error);
      return this.res.status(500).json({
        success: false,
        message: error.message || "Lỗi tính toán khoảng cách và phí ship.",
      });
    }
  }
}
