import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsUUID,
  IsObject,
  Min,
  Max,
  MaxLength,
} from "class-validator";

/**
 * Validator cho tạo Cart mới
 */
export class CreateCartValidator {
  @IsUUID("4", { message: "restaurantId phải là UUID hợp lệ" })
  restaurantId?: string;

  @IsOptional()
  @IsBoolean({ message: "isGroupCart phải là boolean" })
  isGroupCart?: boolean;
}

/**
 * Validator cho thêm item vào cart
 */
export class AddCartItemValidator {
  @IsUUID("4", { message: "menuItemId phải là UUID hợp lệ" })
  menuItemId?: string;

  @IsInt({ message: "quantity phải là số nguyên" })
  @Min(1, { message: "quantity phải lớn hơn 0" })
  @Max(99, { message: "quantity không được vượt quá 99" })
  quantity?: number;

  @IsOptional()
  @IsObject({ message: "selectedOptions phải là object" })
  selectedOptions?: Record<string, any>;

  @IsOptional()
  @IsString({ message: "note phải là chuỗi" })
  @MaxLength(500, { message: "Ghi chú không được vượt quá 500 ký tự" })
  note?: string;
}

/**
 * Validator cho cập nhật CartItem (thay đổi số lượng, ghi chú)
 */
export class UpdateCartItemValidator {
  @IsOptional()
  @IsInt({ message: "quantity phải là số nguyên" })
  @Min(1, { message: "quantity phải lớn hơn 0" })
  @Max(99, { message: "quantity không được vượt quá 99" })
  quantity?: number;

  @IsOptional()
  @IsObject({ message: "selectedOptions phải là object" })
  selectedOptions?: Record<string, any>;

  @IsOptional()
  @IsString({ message: "note phải là chuỗi" })
  @MaxLength(500, { message: "Ghi chú không được vượt quá 500 ký tự" })
  note?: string;
}
