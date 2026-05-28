import {
  IsString, IsOptional, IsBoolean, IsUUID, IsNumber,
  IsArray, MaxLength, MinLength, Min, Max, IsDateString,
} from "class-validator";

/**
 * Validator tạo khuyến mãi / flash sale mới
 */
export class CreatePromotionValidator {
  @IsString({ message: "Mã code phải là chuỗi" })
  @MinLength(2, { message: "Mã code ít nhất 2 ký tự" })
  @MaxLength(50, { message: "Mã code tối đa 50 ký tự" })
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsNumber({}, { message: "discountPercentage phải là số" })
  @Min(0)
  @Max(100, { message: "Giảm giá tối đa 100%" })
  discountPercentage?: number;

  @IsOptional()
  @IsNumber({}, { message: "fixedDiscount phải là số" })
  @Min(0)
  fixedDiscount?: number;

  @IsOptional()
  @IsNumber({}, { message: "minOrderValue phải là số" })
  @Min(0)
  minOrderValue?: number;

  @IsDateString({}, { message: "validFrom phải là ngày hợp lệ (ISO8601)" })
  validFrom?: string;

  @IsDateString({}, { message: "validTo phải là ngày hợp lệ (ISO8601)" })
  validTo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray({ message: "menuItemIds phải là mảng UUID" })
  @IsUUID("4", { each: true, message: "Mỗi menuItemId phải là UUID hợp lệ" })
  menuItemIds?: string[];
}

/**
 * Validator cập nhật khuyến mãi (tất cả optional)
 */
export class UpdatePromotionValidator {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedDiscount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  menuItemIds?: string[];
}