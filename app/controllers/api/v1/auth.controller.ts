import { PasswordType, UserStatus } from "@configs/db/enums";
import models from "@models";
import { AuthGoogleVerifyService, AuthRefreshTokenService, GoogleOAuthCallbackService } from "@services";
import {
  GoogleVerifyValidator,
  LoginValidator,
  RefreshTokenValidator,
  RegisterValidator,
} from "@validators/auth.validator";
import { BadRequestError, Security, UnauthorizedError } from "ts-rails";
import { AuthLoginService } from "../../../services/auth/authLogin.service";
import { AuthMeService } from "../../../services/auth/authMe.service";
import { ApiV1Controller } from "./apiV1.controller";

export class AuthController extends ApiV1Controller {
  [x: string]: any;
  async googleVerify() {
    const { idToken } = await this.params(GoogleVerifyValidator).permit(
      "idToken",
    );
    const result = await new AuthGoogleVerifyService().execute(idToken);
    this.renderJson(result);
  }

  async googleOAuthCallback() {
    try {
      const code =
        this.req.body?.code ||
        this.req.query?.code;

      const redirectUri =
        this.req.body?.redirectUri ||
        this.req.query?.redirectUri;

      const result =
        await new GoogleOAuthCallbackService()
          .execute(
            code as string,
            redirectUri as string
          );

      this.renderJson(result);
    } catch (error) {
      this.logger.error(
        { err: error },
        "Google OAuth callback failed"
      );
      throw error;
    }
  }

  async refreshToken() {
    const { refreshToken } = await this.params(RefreshTokenValidator).permit(
      "refreshToken",
    );

    // Gọi Service xử lý nghiệp vụ refresh
    const result = await new AuthRefreshTokenService().execute(refreshToken);

    this.renderJson(result);
  }

  async login() {
    const { email, password } = await this.params(LoginValidator).permit(
      "email",
      "password",
    );

    const result = await new AuthLoginService().execute(email, password);
    this.renderJson(result);
  }

  async me() {
    const userId = this.req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    const result = await new AuthMeService().execute(userId);
    this.renderJson(result);
  }
  async register() {
    const {
      email,
      password,
      confirmpassword,
      firstname,
      middlename,
      lastname,
      phonenumber,
      address,
      role,
      vehicleType,
      vehicleInfo,
      licensePlate,
      driverLicenseNumber,
      nationalIdNumber,
      restaurantName,
      restaurantAddress,
      cuisineType,
      openTime,
      closeTime,
      restaurantDescription,
    } = await this.params(RegisterValidator).permit(
      "email", "password", "confirmpassword", "firstname", "middlename", "lastname",
      "phonenumber", "address", "role",
      "vehicleType", "vehicleInfo", "licensePlate", "driverLicenseNumber", "nationalIdNumber",
      "restaurantName", "restaurantAddress", "cuisineType", "openTime", "closeTime", "restaurantDescription"
    );

    if (password !== confirmpassword) {
      throw new BadRequestError("Passwords do not match");
    }

    const existingUser = await models.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestError("Email already in use");
    }

    const hashedPassword = await Security.hashPassword(password);
    // Gán vai trò mặc định là CUSTOMER nếu không được cung cấp
    const userRole = role || "CUSTOMER";

    // Validate role-specific fields
    if (userRole === "DRIVER") {
      if (!licensePlate) {
        throw new BadRequestError("Biển số xe là bắt buộc đối với tài xế");
      }
    } else if (userRole === "RESTAURANT") {
      if (!restaurantName) {
        throw new BadRequestError("Tên nhà hàng là bắt buộc đối với đối tác");
      }
      if (!restaurantAddress) {
        throw new BadRequestError("Địa chỉ nhà hàng là bắt buộc đối với đối tác");
      }
    }

    const newUser = await models.user.create({
      data: {
        email,
        firstName: firstname,
        middleName: middlename,
        lastName: lastname,
        phoneNumber: phonenumber,
        address,
        status: UserStatus.ACTIVE,
        deleted: false,
        passwords: {
          create: {
            password: hashedPassword,
            type: PasswordType.PASSWORD,
          },
        },
        roles: {
          create: {
            role: { connect: { code: userRole } },
          },
        },
        profile: {
          create: {
            fullName: `${firstname} ${lastname}`,
            phone: phonenumber,
            ...(userRole === "DRIVER" ? {
              driverProfile: {
                create: {
                  vehicleInfo: vehicleType || vehicleInfo || "MOTORBIKE",
                  licensePlate: licensePlate!,
                  driverLicenseNumber,
                  nationalIdNumber,
                  approvalStatus: "PENDING",
                  currentStatus: "offline",
                },
              },
            } : {}),
            ...(userRole === "RESTAURANT" ? {
              restaurants: {
                create: {
                  name: restaurantName!,
                  address: restaurantAddress!,
                  description: restaurantDescription,
                  cuisineType,
                  openTime,
                  closeTime,
                  approvalStatus: "PENDING",
                  isActive: false,
                },
              },
            } : {}),
          },
        },
      },
    });

    this.renderJson({
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: `${newUser.firstName} ${newUser.lastName}`,
        roles: [userRole],
      },
    }, 201);
  }
}
