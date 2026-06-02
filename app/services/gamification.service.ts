import models from "@models";

export class GamificationService {
  /**
   * Tự động khởi tạo dữ liệu mẫu cho Badge và Mission nếu chưa có
   */
  static async seedIfNeeded() {
    try {
      const badgeCount = await models.badge.count();
      if (badgeCount === 0) {
        await models.badge.createMany({
          data: [
            { name: "Bronze Badge", description: "Huy hiệu Đồng dành cho thành viên tích lũy từ 100 điểm", pointsRequired: 100 },
            { name: "Silver Badge", description: "Huy hiệu Bạc dành cho thành viên tích lũy từ 300 điểm", pointsRequired: 300 },
            { name: "Gold Badge", description: "Huy hiệu Vàng dành cho thành viên tích lũy từ 1000 điểm", pointsRequired: 1000 },
            { name: "Platinum Badge", description: "Huy hiệu Bạch Kim dành cho thành viên tích lũy từ 2500 điểm", pointsRequired: 2500 },
          ]
        });
        console.log("Seeded default badges successfully.");
      }
    } catch (e) {
      console.error("Error seeding badges:", e);
    }

    try {
      const missionCount = await models.mission.count();
      if (missionCount === 0) {
        await models.mission.createMany({
          data: [
            { title: "Nhiệm vụ đặt 1 đơn hàng", description: "Đặt 1 đơn hàng để nhận 10 điểm", pointsReward: 10, type: "DAILY", targetCount: 1 },
            { title: "Nhiệm vụ đặt 3 đơn hàng", description: "Đặt 3 đơn hàng để nhận 50 điểm", pointsReward: 50, type: "WEEKLY", targetCount: 3 },
            { title: "Nhiệm vụ đặt 5 đơn hàng", description: "Đặt 5 đơn hàng để nhận 100 điểm", pointsReward: 100, type: "SPECIAL", targetCount: 5 }
          ]
        });
        console.log("Seeded default missions successfully.");
      }
    } catch (e) {
      console.error("Error seeding missions:", e);
    }
  }

  /**
   * Đảm bảo người dùng đăng ký đầy đủ các nhiệm vụ hoạt động
   */
  static async ensureUserMissions(profileId: string) {
    await this.seedIfNeeded();

    try {
      const activeMissions = await models.mission.findMany({ where: { isActive: true } });
      
      for (const mission of activeMissions) {
        const userMission = await models.userMission.findUnique({
          where: {
            profileId_missionId: {
              profileId,
              missionId: mission.id
            }
          }
        });

        if (!userMission) {
          await models.userMission.create({
            data: {
              profileId,
              missionId: mission.id,
              currentProgress: 0,
              isCompleted: false
            }
          });
        }
      }
    } catch (e) {
      console.error("Error ensuring user missions:", e);
    }
  }

  /**
   * Tự động tích lũy điểm khi đơn hàng hoàn thành
   */
  static async rewardOrderPoints(orderId: string) {
    await this.seedIfNeeded();

    try {
      // 1. Fetch order
      const order = await models.order.findUnique({
        where: { id: orderId }
      });

      if (!order || order.status !== "completed" || !order.customerId) {
        return;
      }

      const profileId = order.customerId;
      const finalAmount = Number(order.finalAmount);
      
      // Quy đổi: 1 điểm cho mỗi 10.000 VND spent
      const pointsEarned = Math.floor(finalAmount / 10000);
      if (pointsEarned <= 0) {
        return;
      }

      // Đảm bảo user có UserMissions
      await this.ensureUserMissions(profileId);

      // 2. Tăng điểm Profile của user
      const profile = await models.profile.findUnique({ where: { id: profileId } });
      if (!profile) return;

      const currentPoints = profile.rewardPoints ?? 0;
      const updatedPoints = currentPoints + pointsEarned;

      // Cập nhật Profile
      await models.profile.update({
        where: { id: profileId },
        data: { rewardPoints: updatedPoints }
      });

      // 3. Ghi log PointHistory
      await models.pointHistory.create({
        data: {
          profileId,
          amount: pointsEarned,
          reason: "ORDER_REWARD"
        }
      });

      // 4. Cập nhật tiến độ Nhiệm vụ (Missions)
      const userMissions = await models.userMission.findMany({
        where: { profileId, isCompleted: false },
        include: { mission: true }
      });

      for (const um of userMissions) {
        const newProgress = um.currentProgress + 1;
        const isCompletedNow = newProgress >= um.mission.targetCount;

        if (isCompletedNow) {
          // Hoàn thành nhiệm vụ
          await models.userMission.update({
            where: {
              profileId_missionId: {
                profileId,
                missionId: um.missionId
              }
            },
            data: {
              currentProgress: um.mission.targetCount,
              isCompleted: true,
              completedAt: new Date()
            }
          });

          // Cộng điểm thưởng nhiệm vụ
          const profileToReward = await models.profile.findUnique({ where: { id: profileId } });
          if (profileToReward) {
            const currentTotal = profileToReward.rewardPoints ?? 0;
            const nextTotal = currentTotal + um.mission.pointsReward;

            await models.profile.update({
              where: { id: profileId },
              data: { rewardPoints: nextTotal }
            });

            await models.pointHistory.create({
              data: {
                profileId,
                amount: um.mission.pointsReward,
                reason: "MISSION_COMPLETED"
              }
            });
          }
        } else {
          // Cập nhật tiến độ bình thường
          await models.userMission.update({
            where: {
              profileId_missionId: {
                profileId,
                missionId: um.missionId
              }
            },
            data: {
              currentProgress: newProgress
            }
          });
        }
      }

      // 5. Nâng hạng Huy hiệu (Badges)
      // Lấy lại điểm mới nhất sau khi cộng cả điểm nhiệm vụ
      const finalProfile = await models.profile.findUnique({ where: { id: profileId } });
      if (!finalProfile) return;

      const totalPoints = finalProfile.rewardPoints ?? 0;

      // So sánh cấu hình huy hiệu thực tế trong DB
      const dbBadges = await models.badge.findMany();
      for (const badge of dbBadges) {
        if (totalPoints >= badge.pointsRequired) {
          // Kiểm tra xem đã nhận huy hiệu này chưa
          const userBadge = await models.userBadge.findUnique({
            where: {
              profileId_badgeId: {
                profileId,
                badgeId: badge.id
              }
            }
          });

          if (!userBadge) {
            await models.userBadge.create({
              data: {
                profileId,
                badgeId: badge.id
              }
            });
          }
        }
      }

      // Cập nhật level text trên Profile (Newbie -> Bronze -> Silver -> Gold -> Platinum)
      let finalLevel = "Newbie";
      if (totalPoints >= 2500) finalLevel = "Platinum";
      else if (totalPoints >= 1000) finalLevel = "Gold";
      else if (totalPoints >= 300) finalLevel = "Silver";
      else if (totalPoints >= 100) finalLevel = "Bronze";

      if (finalProfile.badgeLevel !== finalLevel) {
        await models.profile.update({
          where: { id: profileId },
          data: { badgeLevel: finalLevel }
        });
      }
    } catch (e) {
      console.error("Error rewarding order points:", e);
    }
  }
}
