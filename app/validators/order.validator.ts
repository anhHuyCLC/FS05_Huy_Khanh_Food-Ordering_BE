import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsObject,
  MaxLength,
  IsIn,
  IsNumber,
} from "class-validator";
import { Type } from "class-transformer";

// -------------------- Order Item --------------------
export class OrderItemInput {
  @IsUUID("4", { message: "menuItemId phải là UUID hợp lệ" })
  menuItemId?: string;

  @IsInt({ message: "quantity phải là số nguyên" })
  @Min(1, { message: "Số lượng phải ít nhất là 1" })
  quantity?: number;

  @IsOptional()
  @IsObject({ message: "selectedOptions phải là object" })
  selectedOptions?: Record<string, unknown>;

  @IsOptional()
  @IsString({ message: "note phải là chuỗi" })
  @MaxLength(500, { message: "Ghi chú không quá 500 ký tự" })
  note?: string;
}

// -------------------- Create Order --------------------
export class CreateOrderValidator {
  @IsUUID("4", { message: "restaurantId phải là UUID hợp lệ" })
  restaurantId?: string;

  @IsOptional()
  @IsIn(["standard_delivery", "dine_in", "group_order", "blind_box"], {
    message: "orderType không hợp lệ",
  })
  orderType?: string;

  @IsArray({ message: "items phải là mảng" })
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items?: OrderItemInput[];

  @IsOptional()
  @IsString({ message: "deliveryAddress phải là chuỗi" })
  deliveryAddress?: string;

  @IsOptional()
  @IsNumber({}, { message: "deliveryLatitude phải là số" })
  deliveryLatitude?: number;

  @IsOptional()
  @IsNumber({}, { message: "deliveryLongitude phải là số" })
  deliveryLongitude?: number;

  @IsOptional()
  @IsString({ message: "customerPhone phải là chuỗi" })
  customerPhone?: string;

  @IsOptional()
  @IsString({ message: "promotionCode phải là chuỗi" })
  promotionCode?: string;

  @IsOptional()
  @IsString({ message: "shippingPromotionCode phải là chuỗi" })
  shippingPromotionCode?: string;

  @IsOptional()
  @IsString({ message: "note phải là chuỗi" })
  @MaxLength(1000, { message: "Ghi chú không quá 1000 ký tự" })
  note?: string;

  // Dine-in
  @IsOptional()
  @IsString()
  tableNumber?: string;

  @IsOptional()
  @IsString({ message: "reservationTime phải là chuỗi" })
  reservationTime?: string;


  @IsOptional()
  @IsIn(["cash", "e_wallet", "bank_transfer"], { message: "paymentMethod không hợp lệ" })
  paymentMethod?: "cash" | "e_wallet" | "bank_transfer";

  @IsOptional()
  @IsIn(["momo", "vnpay"], { message: "paymentProvider không hợp lệ" })
  paymentProvider?: "momo" | "vnpay";

}

// -------------------- Update Order Status (restaurant/driver) --------------------
export class UpdateOrderStatusValidator {
  @IsIn(
    ["accepted", "preparing", "ready", "delivering", "completed", "cancelled"],
    { message: "status không hợp lệ" }
  )
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

// -------------------- Cancel Order (customer) --------------------
export class CancelOrderValidator {
  @IsOptional()
  @IsString({ message: "reason phải là chuỗi" })
  @MaxLength(500, { message: "Lý do không quá 500 ký tự" })
  reason?: string;
}

// -------------------- Create Review (customer) --------------------
export class CreateReviewValidator {
  @IsInt({ message: "restaurantRating phải là số nguyên" })
  @Min(1, { message: "Đánh giá nhà hàng tối thiểu là 1 sao" })
  restaurantRating?: number;

  @IsOptional()
  @IsString({ message: "restaurantComment phải là chuỗi" })
  @MaxLength(1000, { message: "Bình luận nhà hàng không quá 1000 ký tự" })
  restaurantComment?: string;

  @IsOptional()
  @IsInt({ message: "driverRating phải là số nguyên" })
  driverRating?: number;

  @IsOptional()
  @IsString({ message: "driverComment phải là chuỗi" })
  driverComment?: string;
}
