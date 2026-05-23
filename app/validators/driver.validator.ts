import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

// -----------------------------------------------------------------------
// 5.1 Bật / Tắt trạng thái nhận đơn
// -----------------------------------------------------------------------
export class UpdateDriverStatusValidator {
  @IsString()
  status!: string; // "online" | "offline" | "busy"
}

// -----------------------------------------------------------------------
// 5.1 Chấp nhận / Bỏ qua đơn giao
// -----------------------------------------------------------------------
export class RespondOrderValidator {
  @IsEnum(["accepted", "rejected"])
  action!: "accepted" | "rejected";

  @IsOptional()
  @IsString()
  reason?: string;
}

// -----------------------------------------------------------------------
// 5.1 Cập nhật trạng thái đơn (Đã lấy hàng / Đang giao)
// -----------------------------------------------------------------------
export class UpdateOrderDeliveryStatusValidator {
  @IsEnum(["picked_up", "delivering", "completed"])
  status!: "picked_up" | "delivering" | "completed";
}

// -----------------------------------------------------------------------
// 5.1 Xem bản đồ – cập nhật vị trí tài xế real-time
// -----------------------------------------------------------------------
export class UpdateLocationValidator {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}

// -----------------------------------------------------------------------
// 5.1 Tối ưu hóa lộ trình – Gom đơn
// -----------------------------------------------------------------------
export class RouteOptimizationValidator {
  @IsOptional()
  @IsUUID("4", { each: true })
  orderIds?: string[]; // Danh sách orderIds muốn gom; nếu rỗng thì tự động lấy từ đơn đang active
}

// -----------------------------------------------------------------------
// 5.2 Thu nhập & ví
// -----------------------------------------------------------------------
export class EarningFilterValidator {
  @IsOptional()
  @IsString()
  from?: string; // ISO date

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  period?: string; // "today" | "week" | "month"
}
