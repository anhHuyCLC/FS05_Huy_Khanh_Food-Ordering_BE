
import { ApiV1Controller } from "..";
import { DriverEarningService } from "@services/driverEarning.service";
import { EarningFilterValidator } from "@validators/driver.validator";

export class DriverEarningController extends ApiV1Controller {
  private service = new DriverEarningService();

  /** GET /api/v1/driver/earnings */
  async index() {
    const profileId = (this.req as any).driverProfileId as string;
    const { period, from, to } = await this.params(EarningFilterValidator).permit(
      "period",
      "from",
      "to"
    );
    const result = await this.service.getEarnings(profileId, period, from, to);
    this.renderJson(result);
  }
}
