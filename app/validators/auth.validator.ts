import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class LoginValidator {
  @IsNotEmpty({ message: "Email is required" })
  @IsEmail()
  email!: string;

  @IsNotEmpty({ message: "Password is required" })
  @IsString()
  @MinLength(1)
  password!: string;
}

export class CreatePasswordValidator {
  @IsNotEmpty({ message: "Email is required" })
  @IsEmail()
  email!: string;
}

export class UpdatePasswordValidator {
  @IsNotEmpty({ message: "Password is required" })
  @IsString()
  @MinLength(6, { message: "Password must be at least 6 characters" })
  password!: string;

  @IsNotEmpty({ message: "Password confirmation is required" })
  @IsString()
  passwordConfirmation!: string;

  @IsOptional()
  @IsString()
  oldPassword?: string;

  @IsOptional()
  @IsString()
  token?: string;
}

export class GoogleVerifyValidator {
  static schema = { idToken: "string" } as const;
  static required = ["idToken"] as const;

  @IsNotEmpty({ message: "Missing ID token" })
  @IsString()
  @MinLength(1)
  idToken!: string;
}

export class RefreshTokenValidator {
  static schema = { refreshToken: "string" } as const;
  static required = ["refreshToken"] as const;

  @IsNotEmpty({ message: "Missing refresh token" })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

export class GoogleOAuthCallbackValidator {
  @IsNotEmpty({ message: "Authorization code is required" })
  @IsString()
  @MinLength(1)
  code!: string;

  @IsOptional()
  @IsString()
  redirectUri?: string;
}

export class RegisterValidator {
  @IsNotEmpty({ message: "Email is required" })
  @IsEmail()
  email!: string;

  @IsNotEmpty({ message: "Password is required" })
  @IsString()
  @MinLength(6, { message: "Password must be at least 6 characters" })
  password!: string;

  @IsNotEmpty({ message: "Password confirmation is required" })
  @IsString()
  confirmpassword!: string;

  @IsNotEmpty({ message: "First name is required" })
  @IsString()
  firstname!: string;

  @IsOptional()
  @IsString()
  middlename?: string;

  @IsNotEmpty({ message: "Last name is required" })
  @IsString()
  lastname!: string;

  @IsOptional()
  @IsString()
  phonenumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @IsIn(['CUSTOMER', 'ADMIN', 'DRIVER', 'RESTAURANT'], { message: 'Role must be one of: CUSTOMER, ADMIN, DRIVER, RESTAURANT' })
  role?: string;

  // Driver fields
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  vehicleInfo?: string;

  @IsOptional()
  @IsString()
  licensePlate?: string;

  @IsOptional()
  @IsString()
  driverLicenseNumber?: string;

  @IsOptional()
  @IsString()
  nationalIdNumber?: string;

  // Restaurant fields
  @IsOptional()
  @IsString()
  restaurantName?: string;

  @IsOptional()
  @IsString()
  restaurantAddress?: string;

  @IsOptional()
  @IsString()
  cuisineType?: string;

  @IsOptional()
  @IsString()
  openTime?: string;

  @IsOptional()
  @IsString()
  closeTime?: string;

  @IsOptional()
  @IsString()
  restaurantDescription?: string;
}
