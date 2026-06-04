import { ApiV1Controller } from "./apiV1.controller";
import { DriverWalletService } from "@services/driverWallet.service";
import { UnauthorizedError } from "ts-rails";
import { TransactionValidator } from "@validators/driver.validator";

export class DriverWalletController extends ApiV1Controller {
  private driverWalletService = new DriverWalletService();

  private getDriverId(): string {
    const driverId = (this.req as any).driverProfileId;
    if (!driverId) throw new UnauthorizedError("Không tìm thấy thông tin tài xế");
    return driverId;
  }

  async deposit() {
    const driverId = this.getDriverId();
    const data = await this.params(TransactionValidator).permit("amount");
    
    const result = await this.driverWalletService.deposit(driverId, data.amount as number);
    
    this.renderJson({
      success: true,
      message: "Nạp tiền thành công",
      walletBalance: result.walletBalance,
      codDebt: result.codDebt,
    });
  }

  async withdraw() {
    const driverId = this.getDriverId();
    const data = await this.params(TransactionValidator).permit("amount");
    
    const result = await this.driverWalletService.withdraw(driverId, data.amount as number);
    
    this.renderJson({
      success: true,
      message: "Rút tiền thành công",
      walletBalance: result.walletBalance,
      codDebt: result.codDebt,
    });
  }
}
