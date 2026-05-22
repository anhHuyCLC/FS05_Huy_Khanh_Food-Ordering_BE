import models from "@models";
import { NotFoundError, UnauthorizedError } from "ts-rails";
import { ApiV1Controller } from "./apiV1.controller";
import {
  CreateAddressValidator,
  UpdateAddressValidator,
} from "@validators/address.validator";

export class ApiV1AddressController extends ApiV1Controller {
  /**
   * Helper to retrieve or create profileId for current user
   */
  private async getProfileId(): Promise<string> {
    const userId = this.currentUser?.id;
    if (!userId) throw new UnauthorizedError("Cần đăng nhập");

    let profile = await models.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      const user = await models.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      if (!user) throw new NotFoundError("Không tìm thấy thông tin User");

      profile = await models.profile.create({
        data: {
          userId,
          fullName: `${user.firstName} ${user.lastName}`.trim(),
        },
        select: { id: true },
      });
    }

    return profile.id;
  }

  /**
   * GET /api/v1/addresses
   * Lấy danh sách địa chỉ đã lưu
   */
  async index() {
    const profileId = await this.getProfileId();

    const addresses = await models.savedAddress.findMany({
      where: { profileId },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" }
      ],
    });

    this.renderJson(addresses);
  }

  /**
   * GET /api/v1/addresses/:id
   * Chi tiết một địa chỉ đã lưu
   */
  async show() {
    const { id } = this.req.params;
    const profileId = await this.getProfileId();

    const address = await models.savedAddress.findFirst({
      where: { id, profileId },
    });

    if (!address) {
      throw new NotFoundError("Không tìm thấy địa chỉ này");
    }

    this.renderJson(address);
  }

  /**
   * POST /api/v1/addresses
   * Thêm địa chỉ mới
   */
  async create() {
    const profileId = await this.getProfileId();
    const data = await this.params(CreateAddressValidator).permit(
      "label",
      "address",
      "latitude",
      "longitude",
      "phone",
      "isDefault"
    );

    const isDefault = data.isDefault ?? false;

    const newAddress = await models.$transaction(async (tx) => {
      // Nếu địa chỉ mới là mặc định, bỏ mặc định của các địa chỉ cũ
      if (isDefault) {
        await tx.savedAddress.updateMany({
          where: { profileId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return await tx.savedAddress.create({
        data: {
          profileId,
          label: data.label!,
          address: data.address!,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          phone: data.phone ?? null,
          isDefault,
        },
      });
    });

    this.renderJson(newAddress, 201);
  }

  /**
   * PATCH /api/v1/addresses/:id
   * Cập nhật địa chỉ
   */
  async update() {
    const { id } = this.req.params;
    const profileId = await this.getProfileId();

    const existingAddress = await models.savedAddress.findFirst({
      where: { id, profileId },
    });

    if (!existingAddress) {
      throw new NotFoundError("Không tìm thấy địa chỉ cần cập nhật");
    }

    const data = await this.params(UpdateAddressValidator).permit(
      "label",
      "address",
      "latitude",
      "longitude",
      "phone",
      "isDefault"
    );

    const updateData: any = {};
    if (data.label !== undefined) updateData.label = data.label;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

    const updatedAddress = await models.$transaction(async (tx) => {
      if (updateData.isDefault === true) {
        await tx.savedAddress.updateMany({
          where: { profileId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      return await tx.savedAddress.update({
        where: { id },
        data: updateData,
      });
    });

    this.renderJson(updatedAddress);
  }

  /**
   * DELETE /api/v1/addresses/:id
   * Xóa địa chỉ đã lưu
   */
  async destroy() {
    const { id } = this.req.params;
    const profileId = await this.getProfileId();

    const existingAddress = await models.savedAddress.findFirst({
      where: { id, profileId },
    });

    if (!existingAddress) {
      throw new NotFoundError("Không tìm thấy địa chỉ cần xóa");
    }

    await models.savedAddress.delete({
      where: { id },
    });

    this.renderJson({ message: "Xóa địa chỉ thành công" });
  }
}
