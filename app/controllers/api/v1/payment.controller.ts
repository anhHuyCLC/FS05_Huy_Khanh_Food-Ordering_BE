import { ApiV1Controller } from "./apiV1.controller";
import { VNPayService } from "@services/vnpay.service";
import models from "@models";

export class PaymentControllerV1 extends ApiV1Controller {
  /**
   * Handles browser redirect back from VNPay.
   * Updates state and redirects back to frontend tracking page.
   */
  public async vnpayReturn() {
    const vnpayService = new VNPayService();
    const query = this.req.query;

    const result = vnpayService.verifyReturnUrl(query);
    const frontendUrl = process.env.VNP_FRONTEND_URL || "http://localhost:5173/tracking";

    if (!result.isValid) {
      return this.res.redirect(`${frontendUrl}?paymentStatus=checksum_failed`);
    }

    // Find the Payment record by paymentCode
    const payment = await models.payment.findUnique({
      where: { paymentCode: result.paymentCode }
    });

    if (!payment) {
      return this.res.redirect(`${frontendUrl}?paymentStatus=not_found`);
    }

    const orderId = payment.orderId;

    if (result.rspCode === "00") {
      // Payment success!
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
      // Payment failed / cancelled -> cancel the order
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
   */
  public async vnpayIpn() {
    const vnpayService = new VNPayService();
    const query = this.req.query;

    const result = vnpayService.verifyReturnUrl(query);

    if (!result.isValid) {
      return this.renderJson({ RspCode: "97", Message: "Checksum failed" });
    }

    const payment = await models.payment.findUnique({
      where: { paymentCode: result.paymentCode }
    });

    if (!payment) {
      return this.renderJson({ RspCode: "01", Message: "Order not found" });
    }

    // Check if amount matches
    if (Math.abs(Number(payment.amount) - result.amount) > 1) {
      return this.renderJson({ RspCode: "04", Message: "Amount invalid" });
    }

    // Check if status is already updated
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
      // IPN: payment failed -> cancel the order
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
