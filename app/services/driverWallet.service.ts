import models from "@models";
import { BadRequestError, NotFoundError } from "ts-rails";
import { Prisma } from "@db";

export class DriverWalletService {
  /**
   * Deposit money into driver's wallet.
   * Priority: Clear COD debt first. The rest goes to wallet balance.
   */
  async deposit(profileId: string, amount: number) {
    if (amount <= 0) throw new BadRequestError("Số tiền nạp phải lớn hơn 0");

    const driver = await models.driverProfile.findUnique({
      where: { id: profileId },
      select: { codDebt: true, walletBalance: true }
    });

    if (!driver) throw new NotFoundError("Hồ sơ tài xế không tìm thấy");

    return models.$transaction(async (tx: Prisma.TransactionClient) => {
      let amountToClearDebt = 0;
      let amountToWallet = 0;
      const currentDebt = Number(driver.codDebt || 0);

      if (currentDebt > 0) {
        amountToClearDebt = Math.min(amount, currentDebt);
        amountToWallet = amount - amountToClearDebt;
      } else {
        amountToWallet = amount;
      }

      const updateData: any = {};
      if (amountToClearDebt > 0) {
        updateData.codDebt = { decrement: amountToClearDebt };
      }
      if (amountToWallet > 0) {
        updateData.walletBalance = { increment: amountToWallet };
      }

      const updatedDriver = await tx.driverProfile.update({
        where: { id: profileId },
        data: updateData,
      });

      if (amountToClearDebt > 0) {
        await tx.walletTransaction.create({
          data: {
            driverId: profileId,
            amount: amountToClearDebt,
            transactionType: "deposit_clear_debt",
            description: `Nạp tiền cấn trừ công nợ COD`,
          },
        });
      }

      if (amountToWallet > 0) {
        await tx.walletTransaction.create({
          data: {
            driverId: profileId,
            amount: amountToWallet,
            transactionType: "deposit_to_wallet",
            description: `Nạp tiền vào ví`,
          },
        });
      }

      return updatedDriver;
    });
  }

  /**
   * Withdraw money from driver's wallet.
   * Only allowed if walletBalance >= amount.
   */
  async withdraw(profileId: string, amount: number) {
    if (amount <= 0) throw new BadRequestError("Số tiền rút phải lớn hơn 0");

    const driver = await models.driverProfile.findUnique({
      where: { id: profileId },
      select: { walletBalance: true }
    });

    if (!driver) throw new NotFoundError("Hồ sơ tài xế không tìm thấy");
    const currentBalance = Number(driver.walletBalance || 0);

    if (currentBalance < amount) {
      throw new BadRequestError(`Số dư ví không đủ (Hiện tại: ${currentBalance})`);
    }

    return models.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedDriver = await tx.driverProfile.update({
        where: { id: profileId },
        data: {
          walletBalance: { decrement: amount },
        },
      });

      await tx.walletTransaction.create({
        data: {
          driverId: profileId,
          amount: amount, // Có thể để nguyên dấu dương, do transactionType định danh loại giao dịch
          transactionType: "withdrawal",
          description: `Rút tiền từ ví`,
        },
      });

      return updatedDriver;
    });
  }
}
