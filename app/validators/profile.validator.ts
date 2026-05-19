import { IsOptional, IsString, IsPhoneNumber, IsUrl, IsBoolean, IsInt, Min, Max, IsEnum, MaxLength, MinLength } from "class-validator";

export class UpdateProfileValidator {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: "Tên không được bỏ trống" })
  @MaxLength(255, { message: "Tên không được vượt quá 255 ký tự" })
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: "Số điện thoại không được vượt quá 20 ký tự" })
  phone?: string;

  @IsOptional()
  @IsUrl({}, { message: "Avatar URL không hợp lệ" })
  avatarUrl?: string;

  @IsOptional()
  @IsBoolean({ message: "isActive phải là boolean" })
  isActive?: boolean;

  @IsOptional()
  @IsInt({ message: "Reward points phải là số nguyên" })
  @Min(0, { message: "Reward points không được âm" })
  @Max(999999, { message: "Reward points quá lớn" })
  rewardPoints?: number;

  @IsOptional()
  @IsEnum(["Newbie", "Bronze", "Silver", "Gold", "Platinum"], {
    message: "Badge level không hợp lệ. Giá trị hợp lệ: Newbie, Bronze, Silver, Gold, Platinum",
  })
  badgeLevel?: string;
}

/**
 * DTO cho update profile của driver
 */
export class UpdateDriverProfileValidator extends UpdateProfileValidator {
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: "Thông tin xe không được vượt quá 255 ký tự" })
  vehicleInfo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: "Biển số xe không được vượt quá 50 ký tự" })
  licensePlate?: string;

  @IsOptional()
  @IsEnum(["online", "offline", "on_delivery"], {
    message: "Trạng thái không hợp lệ. Giá trị hợp lệ: online, offline, on_delivery",
  })
  currentStatus?: string;
}
