import { UserStatus } from "@configs/db/enums";
import models from "@models";
import { UnauthorizedError } from "ts-rails";
import { extractAndMergePermissions } from "../../utils/permission.util";
import { mapUserToDto, UserDto } from "../../mappers/user.mapper";

export class AuthMeService {
  public async execute(userId: string): Promise<{ user: UserDto }> {
    const user = await models.user.findFirst({
      where: {
        id: userId,
        status: UserStatus.ACTIVE,
        deleted: false,
      },
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
    });

    if (!user) {
      throw new UnauthorizedError("User not found or inactive.");
    }

    const mergedPermissions = extractAndMergePermissions(user.roles, user.permissions);
    const userDto = mapUserToDto(user, mergedPermissions);

    return {
      user: userDto,
    };
  }
}
