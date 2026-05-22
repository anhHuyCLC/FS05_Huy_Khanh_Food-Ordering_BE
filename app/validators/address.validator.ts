import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateAddressValidator {
  @IsString({ message: "Nhãn địa chỉ phải là chuỗi" })
  @MinLength(1, { message: "Nhãn địa chỉ không được trống" })
  @MaxLength(100, { message: "Nhãn địa chỉ không quá 100 ký tự" })
  label!: string;

  @IsString({ message: "Địa chỉ phải là chuỗi" })
  @MinLength(1, { message: "Địa chỉ không được trống" })
  address!: string;

  @IsOptional()
  @IsNumber({}, { message: "Vĩ độ phải là số" })
  latitude?: number;

  @IsOptional()
  @IsNumber({}, { message: "Kinh độ phải là số" })
  longitude?: number;

  @IsOptional()
  @IsString({ message: "Số điện thoại phải là chuỗi" })
  @MaxLength(20, { message: "Số điện thoại không quá 20 ký tự" })
  phone?: string;

  @IsOptional()
  @IsBoolean({ message: "Mặc định phải là kiểu boolean" })
  isDefault?: boolean;
}

export class UpdateAddressValidator {
  @IsOptional()
  @IsString({ message: "Nhãn địa chỉ phải là chuỗi" })
  @MinLength(1, { message: "Nhãn địa chỉ không được trống" })
  @MaxLength(100, { message: "Nhãn địa chỉ không quá 100 ký tự" })
  label?: string;

  @IsOptional()
  @IsString({ message: "Địa chỉ phải là chuỗi" })
  @MinLength(1, { message: "Địa chỉ không được trống" })
  address?: string;

  @IsOptional()
  @IsNumber({}, { message: "Vĩ độ phải là số" })
  latitude?: number;

  @IsOptional()
  @IsNumber({}, { message: "Kinh độ phải là số" })
  longitude?: number;

  @IsOptional()
  @IsString({ message: "Số điện thoại phải là chuỗi" })
  @MaxLength(20, { message: "Số điện thoại không quá 20 ký tự" })
  phone?: string;

  @IsOptional()
  @IsBoolean({ message: "Mặc định phải là kiểu boolean" })
  isDefault?: boolean;
}
