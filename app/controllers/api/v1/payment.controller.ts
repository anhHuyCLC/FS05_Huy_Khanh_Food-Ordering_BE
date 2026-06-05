import { ApiV1Controller } from "./apiV1.controller";
import { VNPayService } from "@services/vnpay.service";
import { DriverWalletService } from "@services/driverWallet.service";
import models from "@models";

export class PaymentControllerV1 extends ApiV1Controller {
  /**
   * Handles browser redirect back from VNPay.
   * - Nếu paymentCode bắt đầu bằng "WALLET-" → redirect về driver dashboard
   * - Ngược lại → xử lý order như cũ
   */
  public async vnpayReturn() {
    const vnpayService = new VNPayService();
    const query = this.req.query;

    const result = vnpayService.verifyReturnUrl(query);
    const frontendUrl = process.env.VNP_FRONTEND_URL || "http://localhost:5173/tracking";
    const driverFrontendUrl = process.env.VNP_DRIVER_FRONTEND_URL || "http://localhost:5173/driver";

    if (!result.isValid) {
      // Nếu là wallet payment thất bại
      if (result.paymentCode.startsWith("WALLET-")) {
        return this.res.redirect(`${driverFrontendUrl}?walletStatus=checksum_failed`);
      }
      return this.res.redirect(`${frontendUrl}?paymentStatus=checksum_failed`);
    }

    // ── Wallet top-up ──────────────────────────────────────────────────────────
    if (result.paymentCode.startsWith("WALLET-")) {
      if (result.rspCode === "00") {
        // Thanh toán thành công — IPN đã xử lý cộng tiền, chỉ cần redirect
        return this.res.redirect(`${driverFrontendUrl}?walletStatus=success&amount=${result.amount}`);
      } else {
        // Thanh toán thất bại — cập nhật WalletRequest status = failed
        const walletService = new DriverWalletService();
        await walletService.markDepositFailed(result.paymentCode);
        return this.res.redirect(`${driverFrontendUrl}?walletStatus=failed&code=${result.rspCode}`);
      }
    }

    // ── Order payment (logic cũ) ───────────────────────────────────────────────
    const payment = await models.payment.findUnique({
      where: { paymentCode: result.paymentCode }
    });

    if (!payment) {
      return this.res.redirect(`${frontendUrl}?paymentStatus=not_found`);
    }

    const orderId = payment.orderId;

    if (result.rspCode === "00") {
      await models.$transaction(async (tx) => {
        const currentPayment = await tx.payment.findUnique({ where: { id: payment.id } });
        if (currentPayment && currentPayment.status !== "success") {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "success",
              transactionId: result.transactionNo,
              responseData: query as any,
              paidAt: new Date()
            }
          });

          await tx.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: "success",
              isPaid: true
            }
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId,
              status: "pending",
              note: `Thanh toán VNPay thành công. Mã giao dịch: ${result.transactionNo}`
            }
          });
        }
      });

      return this.res.redirect(`${frontendUrl}?orderId=${orderId}&paymentStatus=success`);
    } else {
      await models.$transaction(async (tx) => {
        const currentPayment = await tx.payment.findUnique({ where: { id: payment.id } });
        if (currentPayment && currentPayment.status === "pending") {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "failed",
              responseData: query as any
            }
          });

          await tx.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: "failed",
              status: "cancelled",
              cancelledAt: new Date()
            }
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId,
              status: "cancelled",
              note: `Thanh toán VNPay thất bại hoặc bị hủy bởi người dùng. Mã phản hồi: ${result.rspCode}`
            }
          });
        }
      });

      return this.res.redirect(`${frontendUrl}?orderId=${orderId}&paymentStatus=failed&code=${result.rspCode}`);
    }
  }

  /**
   * Handles IPN callbacks (background notification) from VNPay server.
   * - Nếu paymentCode bắt đầu bằng "WALLET-" → tự động cộng tiền ví
   * - Ngược lại → xử lý order như cũ
   */
  public async vnpayIpn() {
    const vnpayService = new VNPayService();
    const query = this.req.query;

    const result = vnpayService.verifyReturnUrl(query);

    if (!result.isValid) {
      return this.renderJson({ RspCode: "97", Message: "Checksum failed" });
    }

    // ── Wallet top-up IPN ──────────────────────────────────────────────────────
    if (result.paymentCode.startsWith("WALLET-")) {
      if (result.rspCode === "00") {
        const walletService = new DriverWalletService();
        const walletResult = await walletService.handleVNPayTopUp(
          result.paymentCode,
          result.amount,
          result.transactionNo
        );
        return this.renderJson({ RspCode: walletResult.rspCode, Message: walletResult.message });
      } else {
        // Thanh toán thất bại
        const walletService = new DriverWalletService();
        await walletService.markDepositFailed(result.paymentCode);
        return this.renderJson({ RspCode: "00", Message: "Confirm failed payment" });
      }
    }

    // ── Order payment IPN (logic cũ) ───────────────────────────────────────────
    const payment = await models.payment.findUnique({
      where: { paymentCode: result.paymentCode }
    });

    if (!payment) {
      return this.renderJson({ RspCode: "01", Message: "Order not found" });
    }

    if (Math.abs(Number(payment.amount) - result.amount) > 1) {
      return this.renderJson({ RspCode: "04", Message: "Amount invalid" });
    }

    if (payment.status !== "pending") {
      return this.renderJson({ RspCode: "02", Message: "This order has been updated to the payment status" });
    }

    const orderId = payment.orderId;

    if (result.rspCode === "00") {
      await models.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "success",
            transactionId: result.transactionNo,
            responseData: query as any,
            paidAt: new Date()
          }
        });

        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: "success",
            isPaid: true
          }
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: "pending",
            note: `Thanh toán VNPay thành công (IPN). Mã giao dịch: ${result.transactionNo}`
          }
        });
      });
    } else {
      await models.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "failed",
            responseData: query as any
          }
        });

        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: "failed",
            status: "cancelled",
            cancelledAt: new Date()
          }
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: "cancelled",
            note: `Thanh toán VNPay thất bại (IPN). Mã phản hồi: ${result.rspCode}`
          }
        });
      });
    }

    return this.renderJson({ RspCode: "00", Message: "Confirm Success" });
  }
}
