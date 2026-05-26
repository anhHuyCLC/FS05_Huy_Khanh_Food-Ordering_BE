import { ApplicationJob } from "./application.job";
import { DriverAssignmentService } from "../services/driverAssignment.service";

/**
 * Job chạy định kỳ mỗi 10 giây để kiểm tra và chuyển tiếp
 * đơn hàng nếu tài xế được gán không phản hồi (timeout 30s).
 */
export class DriverAssignmentJob extends ApplicationJob {
  // Lịch chạy: mỗi 10 giây
  static cron = "*/10 * * * * *";

  private service = new DriverAssignmentService();

  async perform(): Promise<void> {
    try {
      await this.service.checkExpiredAssignments();
    } catch (error) {
      console.error("[DriverAssignmentJob] Error running assignment checks:", error);
    }
  }
}
