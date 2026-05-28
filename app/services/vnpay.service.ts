import { ApplicationService } from "./application.service";
import crypto from "crypto";
import dayjs from "dayjs";

export class VNPayService extends ApplicationService {
  /**
   * Helper to sort keys of an object alphabetically and encode values
   * according to VNPay requirements.
   */
  private sortObject(obj: Record<string, any>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys = Object.keys(obj).map(key => encodeURIComponent(key));
    keys.sort();
    
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+");
    }
    return sorted;
  }

  /**
   * Helper to format object to query string without double encoding.
   */
  private stringify(obj: Record<string, string>): string {
    return Object.keys(obj)
      .map(key => `${key}=${obj[key]}`)
      .join("&");
  }

  /**
   * Generates VNPay payment URL for a given payment code and amount.
   */
  public createPaymentUrl(ipAddr: string, paymentCode: string, amount: number): string {
    const tmnCode = process.env.VNP_TMN_CODE;
    const secretKey = process.env.VNP_HASH_SECRET;
    let vnpUrl = process.env.VNP_URL;
    const returnUrl = process.env.VNP_RETURN_URL;

    if (!tmnCode || !secretKey || !vnpUrl || !returnUrl) {
      throw new Error("Missing VNPay environment configuration (VNP_TMN_CODE, VNP_HASH_SECRET, VNP_URL, VNP_RETURN_URL)");
    }

    const date = new Date();
    const createDate = dayjs(date).format("YYYYMMDDHHmmss");

    // Standardize client IP address (handle IPv6 local address ::1)
    let clientIp = ipAddr || "127.0.0.1";
    if (clientIp === "::1" || clientIp === "::ffff:127.0.0.1") {
      clientIp = "127.0.0.1";
    }

    let vnp_Params: Record<string, any> = {};
    vnp_Params["vnp_Version"] = "2.1.0";
    vnp_Params["vnp_Command"] = "pay";
    vnp_Params["vnp_TmnCode"] = tmnCode;
    vnp_Params["vnp_Locale"] = "vn";
    vnp_Params["vnp_CurrCode"] = "VND";
    vnp_Params["vnp_TxnRef"] = paymentCode;
    vnp_Params["vnp_OrderInfo"] = `Thanh toan don hang ${paymentCode}`;
    vnp_Params["vnp_OrderType"] = "other";
    vnp_Params["vnp_Amount"] = Math.round(amount * 100); // VNPay expects amount in cents/VND multiplied by 100
    vnp_Params["vnp_ReturnUrl"] = returnUrl;
    vnp_Params["vnp_IpAddr"] = clientIp;
    vnp_Params["vnp_CreateDate"] = createDate;

    vnp_Params = this.sortObject(vnp_Params);

    const signData = this.stringify(vnp_Params);
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    vnp_Params["vnp_SecureHash"] = signed;
    vnpUrl += "?" + this.stringify(vnp_Params);

    return vnpUrl;
  }

  /**
   * Verifies the VNPay callback/redirect signature.
   */
  public verifyReturnUrl(queryParams: Record<string, any>): {
    isValid: boolean;
    rspCode: string;
    paymentCode: string;
    transactionNo: string;
    amount: number;
  } {
    const secretKey = process.env.VNP_HASH_SECRET;
    if (!secretKey) {
      throw new Error("Missing VNPay VNP_HASH_SECRET environment variable");
    }

    const vnp_Params = { ...queryParams };
    const secureHash = vnp_Params["vnp_SecureHash"];

    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    const sortedParams = this.sortObject(vnp_Params);
    
    const signData = this.stringify(sortedParams);
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    const isValid = secureHash === signed;
    const rspCode = vnp_Params["vnp_ResponseCode"] || "99";
    const paymentCode = vnp_Params["vnp_TxnRef"] || "";
    const transactionNo = vnp_Params["vnp_TransactionNo"] || "";
    const amount = Number(vnp_Params["vnp_Amount"] || 0) / 100;

    return {
      isValid,
      rspCode,
      paymentCode,
      transactionNo,
      amount
    };
  }
}
