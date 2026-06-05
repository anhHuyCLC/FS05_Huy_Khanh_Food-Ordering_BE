import models from "@models";
import { NotFoundError, UnauthorizedError } from "ts-rails";

export class ProfileService {
  async getProfileByUserId(userId: string) {
    const profile = await models.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            createdAt: true,
          },
        },
        driverProfile: true,
      },
    });

    if (!profile) {
      throw new NotFoundError("Profile không tìm thấy");
    }

    return profile;
  }

  async updateProfile(userId: string, data: any, currentUserId: string) {
    // Kiểm tra quyền: chỉ user tự mình mới được update
    if (currentUserId !== userId) {
      throw new UnauthorizedError("Không có quyền cập nhật profile người khác");
    }

    // Kiểm tra profile tồn tại
    const profile = await models.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundError("Profile không tìm thấy");
    }

    // Prepare data để update
    const updateData: any = {};

    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.rewardPoints !== undefined) updateData.rewardPoints = data.rewardPoints;
    if (data.badgeLevel !== undefined) updateData.badgeLevel = data.badgeLevel;

    // Sync với table user nếu cần
    const userUpdateData: any = {};
    if (data.fullName !== undefined) {
      const nameParts = data.fullName.trim().split(/\s+/);
      if (nameParts.length === 1) {
        userUpdateData.firstName = nameParts[0];
        userUpdateData.lastName = "";
        userUpdateData.middleName = null;
      } else if (nameParts.length === 2) {
        userUpdateData.firstName = nameParts[0];
        userUpdateData.lastName = nameParts[1];
        userUpdateData.middleName = null;
      } else {
        userUpdateData.firstName = nameParts[0];
        userUpdateData.lastName = nameParts[nameParts.length - 1];
        userUpdateData.middleName = nameParts.slice(1, nameParts.length - 1).join(" ");
      }
    }
    if (data.phone !== undefined) {
      userUpdateData.phoneNumber = data.phone;
    }
    if (data.avatarUrl !== undefined) {
      userUpdateData.avatarUrl = data.avatarUrl;
    }

    if (Object.keys(userUpdateData).length > 0) {
      await models.user.update({
        where: { id: userId },
        data: userUpdateData,
      });
    }

    // Nếu không có thay đổi
    if (Object.keys(updateData).length === 0 && Object.keys(userUpdateData).length === 0) {
      return profile;
    }

    // Update profile
    const updatedProfile = await models.profile.update({
      where: { userId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
        driverProfile: true,
      },
    });

    // Log audit trail
    await this.logAuditTrail({
      userId,
      action: "PROFILE_UPDATED",
      changes: updateData,
      timestamp: new Date(),
    });

    return updatedProfile;
  }

  private async logAuditTrail(data: any) {
    console.log("[AUDIT LOG]", data);
  }
}
