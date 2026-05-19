import { PasswordType, UserStatus } from "@configs/db/enums";
import { Prisma } from "@db";
import { generateToken } from "@lib";
import models from "@models";
import { UnauthorizedError, Security } from "ts-rails";
import { extractAndMergePermissions } from "../../utils/permission.util";
import { mapUserToDto, UserDto } from "../../mappers/user.mapper";

export class AuthLoginService {
  public async execute(email: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: UserDto }> {
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
    });

    if (!user || user.passwords.length === 0 || !(await Security.verifyPassword(password, user.passwords[0].password))) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    const mergedPermissions = extractAndMergePermissions(user.roles, user.permissions);
    const userRoles = user.roles.map(r => r.role.code);
    const userPermissions = mergedPermissions.map(p => p.code);

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

    await models.$transaction([
      models.password.updateMany({
        where: { userId: user.id, type: PasswordType.REFRESH_TOKEN },
        data: { deleted: true },
      }),
      models.password.create({
        data: {
          userId: user.id,
          password: refreshToken,
          type: PasswordType.REFRESH_TOKEN,
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
