import { PasswordType } from "@configs/db/enums";
import { generateToken, verifyToken } from "@lib";
import { UnauthorizedError } from "ts-rails";
import { ApplicationService } from "../application.service";
import { JwtPayload } from "../../../lib/utils/jwt";
import { extractAndMergePermissions } from "../../utils/permission.util";
import { mapUserToDto } from "../../mappers/user.mapper";

export class AuthRefreshTokenService extends ApplicationService {
  async execute(refreshToken: string) {
    let decoded: JwtPayload;
    try {
      decoded = verifyToken(refreshToken) as JwtPayload;
    } catch (e) {
      throw new UnauthorizedError("Refresh token is not valid.");
    }
    
    // Fallback to id if it's an old token, otherwise sub
    const userId = decoded.sub || (decoded as any).id;
    if (!userId) {
      throw new UnauthorizedError("Refresh token is not valid.");
    }

    const storedToken = await this.models.password.findFirst({
      where: {
        userId,
        password: refreshToken,
        type: PasswordType.REFRESH_TOKEN,
        deleted: false,
      },
      include: {
        user: {
          include: {
            profile: true,
            roles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: {
                        permission: {
                          include: {
                            feature: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            permissions: {
              include: {
                permission: {
                  include: {
                    feature: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!storedToken || !storedToken.user) {
      throw new UnauthorizedError("Refresh token is not valid or has been revoked.");
    }

    const user = storedToken.user;
    const mergedPermissions = extractAndMergePermissions(user.roles, user.permissions);
    const userRoles = user.roles.map((r: any) => r.role.code);
    const userPermissions = mergedPermissions.map(p => p.code);

    const newAccessToken = generateToken(
      { 
        sub: user.id, 
        email: user.email,
        roles: userRoles, 
        permissions: userPermissions,
        tokenVersion: (user as any).tokenVersion || 1
      },
      "1h"
    );

    const newRefreshToken = generateToken(
      { 
        sub: user.id, 
        email: user.email,
        roles: userRoles, 
        permissions: userPermissions,
        tokenVersion: (user as any).tokenVersion || 1
      }, 
      "7d"
    );

    await this.models.$transaction([
      this.models.password.delete({
        where: { id: storedToken.id },
      }),
      this.models.password.create({
        data: {
          userId: user.id,
          password: newRefreshToken,
          type: PasswordType.REFRESH_TOKEN,
        },
      }),
    ]);

    const userDto = mapUserToDto(user, mergedPermissions);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: userDto,
    };
  }
}
