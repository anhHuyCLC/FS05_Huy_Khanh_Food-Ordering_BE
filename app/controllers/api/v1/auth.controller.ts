import { PasswordType, UserStatus } from "@configs/db/enums";
import { Prisma } from "@db";
import { generateToken } from "@lib";
import models from "@models";
import { AuthGoogleVerifyService, AuthRefreshTokenService, GoogleOAuthCallbackService } from "@services";
import {
  GoogleOAuthCallbackValidator,
  GoogleVerifyValidator,
  LoginValidator,
  RefreshTokenValidator,
} from "@validators/auth.validator";
import { Security, UnauthorizedError } from "ts-rails";
import { ApiV1Controller } from ".";

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

    const user = await models.user.findFirst({
      where: {
        email,
        status: UserStatus.ACTIVE,
        deleted: false,
      },
      include: {
        passwords: {
          where: { deleted: false, type: PasswordType.PASSWORD },
          orderBy: { createdAt: Prisma.SortOrder.desc },
          take: 1,
        },
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (
      !user ||
      user.passwords.length === 0 ||
      !(await Security.verifyPassword(password, user.passwords[0].password))
    ) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    const userRoles = user.roles.map((r: { role: { code: string } }) => r.role.code);

    const accessToken = generateToken(
      { id: user.id, roles: userRoles },
      "1h",
    );
    const refreshToken = generateToken({ id: user.id }, "7d");

    // Xoá các refresh token cũ và tạo mới (Token Rotation)
    await models.$transaction([
      models.password.updateMany({
        where: {
          userId: user.id,
          type: PasswordType.REFRESH_TOKEN,
        },
        data: {
          deleted: true,
        },
      }),
      models.password.create({
        data: {
          userId: user.id,
          password: refreshToken,
          type: PasswordType.REFRESH_TOKEN,
        },
      }),
    ]);

    this.renderJson({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: `${user.firstName} ${user.lastName}`,
        roles: userRoles,
      },
    });
  }
}
