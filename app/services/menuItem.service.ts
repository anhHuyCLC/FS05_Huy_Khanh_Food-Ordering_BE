import models from "@models";
import { NotFoundError, UnauthorizedError } from "ts-rails";

export class MenuItemService {
  /**
   * Lấy danh sách MenuItem của một nhà hàng
   */
  async getMenuItems(restaurantId: string, filters?: any) {
    const items = await models.menuItem.findMany({
      where: {
        restaurantId,
        ...(filters?.isAvailable !== undefined && { isAvailable: filters.isAvailable }),
        ...(filters?.categoryId && { categoryId: filters.categoryId }),
      },
      include: {
        category: true,
        optionGroups: {
          include: {
            choices: true,
          },
        },
        appliedPromotions: true,
      },
      orderBy: { createdAt: "desc" },
      skip: filters?.skip || 0,
      take: filters?.take || 20,
    });

    return items;
  }

  /**
   * Lấy chi tiết MenuItem
   */
  async getMenuItem(menuItemId: string) {
    const item = await models.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        category: true,
        restaurant: true,
        optionGroups: {
          include: {
            choices: true,
          },
        },
        appliedPromotions: true,
        reviews: {
          select: {
            rating: true,
            comment: true,
            createdAt: true,
            reviewer: {
              select: {
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundError("Món ăn không tìm thấy");
    }

    return item;
  }

  /**
   * Tạo MenuItem mới
   */
  async createMenuItem(restaurantId: string, data: any, userId: string) {
    // Kiểm tra quyền: user phải là owner của nhà hàng
    const restaurant = await models.restaurant.findUnique({
      where: { id: restaurantId },
      select: { ownerId: true },
    });

    if (!restaurant) {
      throw new NotFoundError("Nhà hàng không tìm thấy");
    }

    if (restaurant.ownerId !== userId) {
      throw new UnauthorizedError("Bạn không có quyền thêm món ăn cho nhà hàng này");
    }

    // Kiểm tra tên MenuItem đã tồn tại chưa
    const existingItem = await models.menuItem.findFirst({
      where: {
        restaurantId,
        name: data.name,
      },
    });

    if (existingItem) {
      throw new Error("Món ăn này đã tồn tại trong nhà hàng");
    }

    // Nếu có categoryId, kiểm tra category tồn tại
    if (data.categoryId) {
      const category = await models.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category || category.restaurantId !== restaurantId) {
        throw new NotFoundError("Danh mục không tìm thấy");
      }
    }

    // Tạo MenuItem
    const newItem = await models.menuItem.create({
      data: {
        restaurantId,
        name: data.name,
        description: data.description || null,
        basePrice: parseFloat(data.basePrice),
        categoryId: data.categoryId || null,
        imageUrl: data.imageUrl || null,
        isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
      },
      include: {
        category: true,
        optionGroups: {
          include: {
            choices: true,
          },
        },
      },
    });

    return newItem;
  }

  /**
   * Cập nhật MenuItem
   */
  async updateMenuItem(menuItemId: string, data: any, userId: string) {
    // Lấy MenuItem hiện tại
    const menuItem = await models.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        restaurant: {
          select: { ownerId: true },
        },
      },
    });

    if (!menuItem) {
      throw new NotFoundError("Món ăn không tìm thấy");
    }

    // Kiểm tra quyền: user phải là owner của nhà hàng
    if (menuItem.restaurant.ownerId !== userId) {
      throw new UnauthorizedError("Bạn không có quyền cập nhật món ăn này");
    }

    // Nếu thay đổi tên, kiểm tra không trùng với các món khác
    if (data.name && data.name !== menuItem.name) {
      const existingItem = await models.menuItem.findFirst({
        where: {
          restaurantId: menuItem.restaurantId,
          name: data.name,
          id: { not: menuItemId },
        },
      });

      if (existingItem) {
        throw new Error("Tên món ăn này đã tồn tại trong nhà hàng");
      }
    }

    // Nếu thay đổi category, kiểm tra category tồn tại
    if (data.categoryId && data.categoryId !== menuItem.categoryId) {
      const category = await models.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category || category.restaurantId !== menuItem.restaurantId) {
        throw new NotFoundError("Danh mục không tìm thấy");
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.basePrice !== undefined) updateData.basePrice = parseFloat(data.basePrice);
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable;

    // Cập nhật MenuItem
    const updatedItem = await models.menuItem.update({
      where: { id: menuItemId },
      data: updateData,
      include: {
        category: true,
        optionGroups: {
          include: {
            choices: true,
          },
        },
      },
    });

    return updatedItem;
  }

  /**
   * Cập nhật availability (ẩn/hiện)
   */
  async updateAvailability(menuItemId: string, isAvailable: boolean, userId: string, reason?: string) {
    // Lấy MenuItem hiện tại
    const menuItem = await models.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        restaurant: {
          select: { ownerId: true },
        },
      },
    });

    if (!menuItem) {
      throw new NotFoundError("Món ăn không tìm thấy");
    }

    // Kiểm tra quyền
    if (menuItem.restaurant.ownerId !== userId) {
      throw new UnauthorizedError("Bạn không có quyền cập nhật món ăn này");
    }

    // Cập nhật availability
    const updatedItem = await models.menuItem.update({
      where: { id: menuItemId },
      data: { isAvailable },
    });

    // TODO: Log reason tại sao tạm ngưng
    if (reason) {
      await this.logMenuItemStatusChange({
        menuItemId,
        previousStatus: menuItem.isAvailable,
        newStatus: isAvailable,
        reason,
        changedBy: userId,
        changedAt: new Date(),
      });
    }

    return updatedItem;
  }

  /**
   * Xóa MenuItem
   */
  async deleteMenuItem(menuItemId: string, userId: string) {
    // Lấy MenuItem hiện tại
    const menuItem = await models.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        restaurant: {
          select: { ownerId: true },
        },
      },
    });

    if (!menuItem) {
      throw new NotFoundError("Món ăn không tìm thấy");
    }

    // Kiểm tra quyền
    if (menuItem.restaurant.ownerId !== userId) {
      throw new UnauthorizedError("Bạn không có quyền xóa món ăn này");
    }

    // Xóa MenuItem (cascade sẽ xóa các option groups, cart items, etc)
    await models.menuItem.delete({
      where: { id: menuItemId },
    });

    return { success: true, message: "Xóa món ăn thành công" };
  }

  /**
   * Log thay đổi trạng thái MenuItem
   */
  private async logMenuItemStatusChange(data: any) {
    console.log("[MENU_ITEM_STATUS_LOG]", data);
    // TODO: Implement proper logging to database
  }
}
