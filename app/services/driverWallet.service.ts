import models from "@models";
import { BadRequestError, NotFoundError } from "ts-rails";
import { Prisma } from "@db";
import { VNPayService } from "./vnpay.service";

export class DriverWalletService {
  /**
   * Tạo yêu cầu nạp tiền qua VNPay — trả về payment URL để driver thanh toán.
   * Khi VNPay xác nhận thanh toán thành công, handleVNPayTopUp sẽ tự cộng vào ví.
   */
  async createVNPayDepositUrl(profileId: string, amount: number, ipAddr: string) {
    if (amount <= 0) throw new BadRequestError("Số tiền nạp phải lớn hơn 0");
    if (amount < 10000) throw new BadRequestError("Số tiền nạp tối thiểu là 10.000đ");

    const driver = await models.driverProfile.findUnique({
      where: { id: profileId },
      select: { id: true },
    });
    if (!driver) throw new NotFoundError("Hồ sơ tài xế không tìm thấy");

    // Kiểm tra không có yêu cầu VNPay đang pending (tránh spam)
    const existingPending = await models.walletRequest.findFirst({
      where: { driverId: profileId, type: "deposit", status: "pending_payment" },
    });
    if (existingPending) {
      // Nếu đã có request pending, tái sử dụng nó (cùng payment code)
      const vnpayService = new VNPayService();
      const paymentUrl = vnpayService.createPaymentUrl(ipAddr, existingPending.paymentCode!, Number(existingPending.amount));
      return { requestId: existingPending.id, paymentUrl };
    }

    // Tạo WalletRequest mới
    const request = await models.walletRequest.create({
      data: {
        driverId: profileId,
        type: "deposit",
        amount: new Prisma.Decimal(amount),
        status: "pending_payment",
      },
    });

    // Tạo paymentCode dạng WALLET-XXXXXXXX (VNPay txnRef)
    const paymentCode = `WALLET-${request.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

    // Cập nhật paymentCode vào request
    await models.walletRequest.update({
      where: { id: request.id },
      data: { paymentCode },
    });

    const vnpayService = new VNPayService();
    const paymentUrl = vnpayService.createPaymentUrl(ipAddr, paymentCode, amount);

    return { requestId: request.id, paymentUrl };
  }

  /**
   * Xử lý callback từ VNPay IPN — tự động cộng tiền vào ví khi thanh toán thành công.
   * Được gọi từ PaymentController.vnpayIpn() khi paymentCode bắt đầu bằng "WALLET-".
   */
  async handleVNPayTopUp(paymentCode: string, amount: number, transactionNo: string) {
    const request = await models.walletRequest.findFirst({
      where: { paymentCode },
    });

    if (!request) return { rspCode: "01", message: "Wallet request not found" };
    if (request.status === "approved") return { rspCode: "02", message: "Already processed" };
    if (request.status !== "pending_payment") return { rspCode: "02", message: "Invalid status" };

    // Validate amount khớp (cho phép sai 1 VND do làm tròn)
    if (Math.abs(Number(request.amount) - amount) > 1) {
      return { rspCode: "04", message: "Amount mismatch" };
    }

    await models.$transaction(async (tx: Prisma.TransactionClient) => {
      // Cập nhật WalletRequest
      await tx.walletRequest.update({
        where: { id: request.id },
        data: {
          status: "approved",
          adminNote: `VNPay auto: ${transactionNo}`,
          reviewedAt: new Date(),
        },
      });

      // Lấy nợ COD để ưu tiên trừ nợ
      const driver = await tx.driverProfile.findUnique({
        where: { id: request.driverId },
        select: { codDebt: true },
      });
      const currentDebt = Number(driver?.codDebt || 0);
      const depositAmount = Number(request.amount);
      const clearDebt = Math.min(depositAmount, currentDebt);
      const toWallet = depositAmount - clearDebt;

      const updateData: any = {};
      if (clearDebt > 0) updateData.codDebt = { decrement: clearDebt };
      if (toWallet > 0) updateData.walletBalance = { increment: toWallet };

      await tx.driverProfile.update({
        where: { id: request.driverId },
        data: updateData,
      });

      if (clearDebt > 0) {
        await tx.walletTransaction.create({
          data: {
            driverId: request.driverId,
            amount: new Prisma.Decimal(clearDebt),
            transactionType: "deposit_clear_debt",
            description: `Nạp tiền VNPay — cấn trừ công nợ COD. GD: ${transactionNo}`,
          },
        });
      }
      if (toWallet > 0) {
        await tx.walletTransaction.create({
          data: {
            driverId: request.driverId,
            amount: new Prisma.Decimal(toWallet),
            transactionType: "deposit_to_wallet",
            description: `Nạp tiền VNPay thành công. GD: ${transactionNo}`,
          },
        });
      }
    });

    return { rspCode: "00", message: "Success" };
  }

  /**
   * Đánh dấu yêu cầu nạp tiền thất bại (VNPay từ chối hoặc hủy).
   */
  async markDepositFailed(paymentCode: string) {
    await models.walletRequest.updateMany({
      where: { paymentCode, status: "pending_payment" },
      data: { status: "rejected", adminNote: "VNPay: payment failed or cancelled", reviewedAt: new Date() },
    });
  }

  /**
   * Tạo yêu cầu rút tiền — kiểm tra số dư rồi chờ admin duyệt.
   */

  async createWithdrawRequest(
    profileId: string,
    amount: number,
    bankName: string,
    bankAccount: string,
    bankOwner: string,
    note?: string
  ) {
    if (amount <= 0) throw new BadRequestError("Số tiền rút phải lớn hơn 0");
    if (amount < 50000) throw new BadRequestError("Số tiền rút tối thiểu là 50.000đ");
    if (!bankName || !bankAccount || !bankOwner) {
      throw new BadRequestError("Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng");
    }

    const driver = await models.driverProfile.findUnique({
      where: { id: profileId },
      select: { walletBalance: true, codDebt: true },
    });
    if (!driver) throw new NotFoundError("Hồ sơ tài xế không tìm thấy");

    const balance = Number(driver.walletBalance || 0);
    if (balance < amount) {
      throw new BadRequestError(
        `Số dư ví không đủ. Số dư hiện tại: ${balance.toLocaleString("vi-VN")}đ`
      );
    }

    const debt = Number(driver.codDebt || 0);
    if (debt > 0) {
      throw new BadRequestError(
        `Bạn đang có công nợ COD ${debt.toLocaleString("vi-VN")}đ. Vui lòng thanh toán trước khi rút tiền.`
      );
    }

    // Kiểm tra không có yêu cầu rút tiền đang pending
    const existingPending = await models.walletRequest.findFirst({
      where: { driverId: profileId, type: "withdraw", status: "pending" },
    });
    if (existingPending) {
      throw new BadRequestError(
        "Bạn đang có yêu cầu rút tiền chờ xử lý. Vui lòng đợi admin xác nhận trước khi tạo yêu cầu mới."
      );
    }

    const request = await models.walletRequest.create({
      data: {
        driverId: profileId,
        type: "withdraw",
        amount: new Prisma.Decimal(amount),
        status: "pending",
        bankName,
        bankAccount,
        bankOwner,
        note: note ?? null,
      },
    });

    return {
      requestId: request.id,
      amount,
      status: "pending",
      message: "Yêu cầu rút tiền đã được gửi. Admin sẽ xử lý trong vòng 24 giờ.",
    };
  }

  /**
   * Lấy danh sách yêu cầu ví của driver.
   */
  async getMyWalletRequests(profileId: string) {
    return models.walletRequest.findMany({
      where: { driverId: profileId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  // ─── Admin actions ────────────────────────────────────────────────────────────

  /**
   * Admin: lấy tất cả yêu cầu ví (có thể lọc theo status).
   */
  async getAllWalletRequests(status?: string) {
    return models.walletRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        driver: {
          include: { profile: { select: { fullName: true, phone: true } } },
        },
      },
    });
  }

  /**
   * Admin: duyệt yêu cầu nạp/rút tiền → cập nhật ví driver.
   */
  async approveWalletRequest(requestId: string, adminNote?: string) {
    const req = await models.walletRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundError("Yêu cầu không tồn tại");
    if (req.status !== "pending") {
      throw new BadRequestError("Yêu cầu này đã được xử lý trước đó");
    }

    return models.$transaction(async (tx: Prisma.TransactionClient) => {
      // Cập nhật trạng thái yêu cầu
      await tx.walletRequest.update({
        where: { id: requestId },
        data: { status: "approved", adminNote: adminNote ?? null, reviewedAt: new Date() },
      });

      if (req.type === "deposit") {
        // Nạp tiền: ưu tiên xóa nợ, còn lại vào ví
        const driver = await tx.driverProfile.findUnique({
          where: { id: req.driverId },
          select: { codDebt: true },
        });
        const currentDebt = Number(driver?.codDebt || 0);
        const amount = Number(req.amount);
        const clearDebt = Math.min(amount, currentDebt);
        const toWallet = amount - clearDebt;

        const updateData: any = {};
        if (clearDebt > 0) updateData.codDebt = { decrement: clearDebt };
        if (toWallet > 0) updateData.walletBalance = { increment: toWallet };

        await tx.driverProfile.update({
          where: { id: req.driverId },
          data: updateData,
        });

        if (clearDebt > 0) {
          await tx.walletTransaction.create({
            data: {
              driverId: req.driverId,
              amount: new Prisma.Decimal(clearDebt),
              transactionType: "deposit_clear_debt",
              description: `Admin duyệt nạp tiền — cấn trừ công nợ COD`,
            },
          });
        }
        if (toWallet > 0) {
          await tx.walletTransaction.create({
            data: {
              driverId: req.driverId,
              amount: new Prisma.Decimal(toWallet),
              transactionType: "deposit_to_wallet",
              description: `Admin duyệt nạp tiền vào ví`,
            },
          });
        }
      } else {
        // Rút tiền: trừ số dư ví
        const driver = await tx.driverProfile.findUnique({
          where: { id: req.driverId },
          select: { walletBalance: true },
        });
        const balance = Number(driver?.walletBalance || 0);
        const amount = Number(req.amount);
        if (balance < amount) {
          throw new BadRequestError(
            `Số dư ví không đủ để thực hiện rút tiền (hiện tại: ${balance.toLocaleString("vi-VN")}đ)`
          );
        }

        await tx.driverProfile.update({
          where: { id: req.driverId },
          data: { walletBalance: { decrement: amount } },
        });

        await tx.walletTransaction.create({
          data: {
            driverId: req.driverId,
            amount: new Prisma.Decimal(amount),
            transactionType: "withdrawal",
            description: `Admin duyệt rút tiền sang ${req.bankName} - ${req.bankAccount}`,
          },
        });
      }

      return { success: true };
    });
  }

  /**
   * Admin: từ chối yêu cầu ví.
   */
  async rejectWalletRequest(requestId: string, adminNote?: string) {
    const req = await models.walletRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundError("Yêu cầu không tồn tại");
    if (req.status !== "pending") {
      throw new BadRequestError("Yêu cầu này đã được xử lý trước đó");
    }

    await models.walletRequest.update({
      where: { id: requestId },
      data: { status: "rejected", adminNote: adminNote ?? null, reviewedAt: new Date() },
    });

    return { success: true };
  }
}
