import { PaymentControllerV1 } from "@controllers/api/v1/payment.controller";
import { action, RailsRoute } from "ts-rails";

export class PaymentRouteV1 extends RailsRoute {
  public draw() {
    this.get("/payments/vnpay_return", action(PaymentControllerV1, "vnpayReturn"));
    this.get("/payments/vnpay_ipn", action(PaymentControllerV1, "vnpayIpn"));
  }
}
