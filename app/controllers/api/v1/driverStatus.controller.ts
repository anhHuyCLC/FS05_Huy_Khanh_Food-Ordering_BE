// ============================================================
// app/controllers/api/v1/driver/driverStatus.controller.ts
// ============================================================
import { UnauthorizedError } from "ts-rails";
import { ApiV1Controller } from "..";
import { DriverStatusService } from "@services/driverStatus.service";
import { UpdateDriverStatusValidator } from "@validators/driver.validator";

export class DriverStatusController extends ApiV1Controller {
  private service = new DriverStatusService();

  /** GET /api/v1/driver/profile */
  async show() {
    const profileId = (this.req as any).driverProfileId as string;
    const profile = await this.service.getProfile(profileId);
    this.renderJson(profile);
  }

  /** PATCH /api/v1/driver/status */
  async updateStatus() {
    const profileId = (this.req as any).driverProfileId as string;
    const { status } = await this.params(UpdateDriverStatusValidator).permit("status");
    const result = await this.service.updateStatus(profileId, status!);
    this.renderJson({ success: true, data: result });
  }
}
