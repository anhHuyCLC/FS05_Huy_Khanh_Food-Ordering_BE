import env from "@configs/env";
import { generateToken } from "@lib";
import models from "@models";
import { OAuth2Client } from "google-auth-library";
import { UnauthorizedError } from "ts-rails";
import { ApplicationService } from "../application.service";
import { extractAndMergePermissions } from "../../utils/permission.util";

import { mapUserToDto, UserDto } from "../../mappers/user.mapper";

export interface GoogleVerifyResult {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

export class AuthGoogleVerifyService extends ApplicationService {
  private googleClient = new OAuth2Client(env.googleClientId);

  async execute(idToken: string): Promise<GoogleVerifyResult> {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: env.googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new UnauthorizedError("Invalid ID token");
    }

    // Check thêm trường email_verified nếu cần thiết để đảm bảo bảo mật
    if (!payload.email_verified) {
      throw new UnauthorizedError("Email not verified by Google");
    }

    const { email, given_name, family_name, picture, sub } = payload;

    let user = await this.models.user.findUnique({
      where: { email: email! },
      include: { roles: { include: { role: { include: { permissions: true } } } }, permissions: true },
    });

    if (!user) {
      user = await this.models.user.create({
        data: {
          email: email!,
          firstName: given_name || "",
          lastName: family_name || "",
          avatarUrl: picture || "",
          status: "ACTIVE",
          googleId: sub,
          roles: {
            create: [{ role: { connect: { code: "WORKER" } } }],
          },
        },
        include: { roles: { include: { role: { include: { permissions: true } } } }, permissions: true },
      });
    } else {
      // Cập nhật thông tin mới nhất từ Google (Social Sync)
      user = await this.models.user.update({
        where: { id: user.id },
        data: {
          firstName: given_name || user.firstName,
          lastName: family_name || user.lastName,
          avatarUrl: picture || user.avatarUrl,
          googleId: user.googleId || sub, // Tránh overwrite nếu đã có
        },
        include: { roles: { include: { role: { include: { permissions: true } } } }, permissions: true },
      });
    }

    // 1. Tạo JWT Access Token & Refresh Token
    // Thường mình sẽ đưa thêm role/permissions vào AccessToken để Backend không phải query DB nhiều lần
    const mergedPermissions = extractAndMergePermissions(user.roles, user.permissions);
    const userRoles = user.roles.map((r: any) => r.role.code);
    const userPermissions = mergedPermissions.map(p => p.code);

    // 4. Tạo JWT token
    const accessToken = generateToken(
      { 
        sub: user.id, 
        email: user.email,
        roles: userRoles, 
        permissions: userPermissions,
        tokenVersion: (user as any).tokenVersion || 1
      },
      "1h"
    );

    const refreshToken = generateToken(
      { 
        sub: user.id, 
        email: user.email,
        roles: userRoles, 
        permissions: userPermissions,
        tokenVersion: (user as any).tokenVersion || 1
      }, 
      "7d"
    );

    // 2. Lưu RefreshToken vào Database nếu anh muốn quản lý Logout/Revoke
    await this.models.$transaction([
      // Xóa các Refresh Token cũ của user này để dọn dẹp (Optional nhưng nên làm)
      this.models.password.deleteMany({
        where: {
          userId: user.id,
          type: "REFRESH_TOKEN",
        },
      }),
      // Lưu token mới
      this.models.password.create({
        data: {
          userId: user.id,
          password: refreshToken, // Lưu token vào field password
          type: "REFRESH_TOKEN",
        },
      }),
    ]);

    const userDto = mapUserToDto(user, mergedPermissions);

    return {
      accessToken,
      refreshToken,
      user: userDto,
    };
  }
}
