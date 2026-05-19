import { IsString, IsOptional, IsBoolean, IsUUID, MaxLength, MinLength, IsUrl } from "class-validator";

/**
 * Validator cho tạo MenuItem mới
 */
export class CreateMenuItemValidator {
  @IsString({ message: "Tên món ăn phải là chuỗi" })
  @MinLength(1, { message: "Tên không được bỏ trống" })
  @MaxLength(255, { message: "Tên không được vượt quá 255 ký tự" })
  name?: string;

  @IsOptional()
  @IsString({ message: "Mô tả phải là chuỗi" })
  description?: string;

  @IsString({ message: "Giá phải là số" })
  basePrice?: string; // Sẽ convert thành number

  @IsOptional()
  @IsUUID("4", { message: "categoryId phải là UUID hợp lệ" })
  categoryId?: string;

  @IsOptional()
  @IsUrl({}, { message: "Image URL không hợp lệ" })
  imageUrl?: string;

  @IsOptional()
  @IsBoolean({ message: "isAvailable phải là boolean" })
  isAvailable?: boolean;
}

/**
 * Validator cho cập nhật MenuItem
 */
export class UpdateMenuItemValidator {
  @IsOptional()
  @IsString({ message: "Tên món ăn phải là chuỗi" })
  @MinLength(1, { message: "Tên không được bỏ trống" })
  @MaxLength(255, { message: "Tên không được vượt quá 255 ký tự" })
  name?: string;

  @IsOptional()
  @IsString({ message: "Mô tả phải là chuỗi" })
  description?: string;

  @IsOptional()
  @IsString({ message: "Giá phải là số" })
  basePrice?: string;

  @IsOptional()
  @IsUUID("4", { message: "categoryId phải là UUID hợp lệ" })
  categoryId?: string;

  @IsOptional()
  @IsUrl({}, { message: "Image URL không hợp lệ" })
  imageUrl?: string;

  @IsOptional()
  @IsBoolean({ message: "isAvailable phải là boolean" })
  isAvailable?: boolean;
}

/**
 * Validator cho cập nhật trạng thái Availability
 */
export class UpdateMenuItemAvailabilityValidator {
  @IsBoolean({ message: "isAvailable phải là boolean" })
  isAvailable?: boolean;

  @IsOptional()
  @IsString({ message: "Lý do phải là chuỗi" })
  @MaxLength(500, { message: "Lý do không được vượt quá 500 ký tự" })
  reason?: string; // Lý do tạm ngưng: hết nguyên liệu, đang bảo trì, v.v.
}
