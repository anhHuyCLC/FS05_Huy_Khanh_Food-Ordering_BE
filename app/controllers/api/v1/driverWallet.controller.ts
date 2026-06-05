import { ApiV1Controller } from "./apiV1.controller";
import { DriverWalletService } from "@services/driverWallet.service";
import { UnauthorizedError } from "ts-rails";

export class DriverWalletController extends ApiV1Controller {
  private driverWalletService = new DriverWalletService();

  private getDriverId(): string {
    const driverId = (this.req as any).driverProfileId;
    if (!driverId) throw new UnauthorizedError("Không tìm thấy thông tin tài xế");
    return driverId;
  }

  /**
   * POST /wallet/deposit
   * Tạo yêu cầu nạp tiền qua VNPay — trả về payment URL để driver quét QR.
   */
  async requestDeposit() {
    const driverId = this.getDriverId();
    const { amount } = this.req.body;

    if (!amount || isNaN(Number(amount))) {
      return this.renderJson({ success: false, message: "Số tiền không hợp lệ" }, 400);
    }

    // Lấy IP từ request
    const ipAddr =
      (this.req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
      this.req.socket.remoteAddress ||
      "127.0.0.1";

    const result = await this.driverWalletService.createVNPayDepositUrl(
      driverId,
      Number(amount),
      ipAddr
    );

    this.renderJson({
      success: true,
      message: "Đã tạo liên kết thanh toán VNPay. Vui lòng quét mã QR để hoàn tất.",
      data: result,
    });
  }


  /**
   * POST /wallet/withdraw
   * Tạo yêu cầu rút tiền — kiểm tra số dư và lưu thông tin ngân hàng.
   */
  async requestWithdraw() {
    const driverId = this.getDriverId();
    const { amount, bankName, bankAccount, bankOwner, note } = this.req.body;

    if (!amount || isNaN(Number(amount))) {
      return this.renderJson({ success: false, message: "Số tiền không hợp lệ" }, 400);
    }

    const result = await this.driverWalletService.createWithdrawRequest(
      driverId,
      Number(amount),
      bankName,
      bankAccount,
      bankOwner,
      note
    );

    this.renderJson({
      success: true,
      message: result.message,
      data: result,
    });
  }

  /**
   * GET /wallet/requests
   * Lấy lịch sử yêu cầu nạp/rút tiền của driver.
   */
  async getWalletRequests() {
    const driverId = this.getDriverId();
    const requests = await this.driverWalletService.getMyWalletRequests(driverId);

    this.renderJson({
      success: true,
      data: requests,
    });
  }
}
