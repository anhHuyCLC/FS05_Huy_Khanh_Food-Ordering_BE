import models from "@models";
import { NotFoundError, UnauthorizedError } from "ts-rails";
import { ApiV1Controller } from ".";
import { MenuItemService } from "@services/menuItem.service";
import {
  CreateMenuItemValidator,
  UpdateMenuItemValidator,
  UpdateMenuItemAvailabilityValidator,
} from "@validators/menuItem.validator";

export class MenuItemControllerV1 extends ApiV1Controller {
  private menuItemService = new MenuItemService();

 
  async index() {
    const restaurantId = this.req.params.restaurantId;

    // Kiểm tra nhà hàng tồn tại
    const restaurant = await models.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundError("Nhà hàng không tìm thấy");
    }

    // Lấy filter từ query params
    const filters = {
      isAvailable: this.req.query.isAvailable === "false" ? false : undefined,
      categoryId: this.req.query.categoryId as string,
      skip: parseInt(this.req.query.skip as string) || 0,
      take: parseInt(this.req.query.take as string) || 20,
    };

    const items = await this.menuItemService.getMenuItems(restaurantId, filters);

    this.renderJson({
      success: true,
      data: items,
      count: items.length,
    });
  }


  async show() {
    const menuItemId = this.req.params.menuItemId;

    const item = await this.menuItemService.getMenuItem(menuItemId);

    this.renderJson({
      success: true,
      data: item,
    });
  }

 
  async create() {
    const restaurantId = this.req.params.restaurantId;
    const currentUserId = this.currentUser?.id;

    if (!currentUserId) {
      throw new UnauthorizedError("Cần đăng nhập để thêm món ăn");
    }

    const data = await this.params(CreateMenuItemValidator).permit(
      "name",
      "description",
      "basePrice",
      "categoryId",
      "imageUrl",
      "isAvailable"
    );

    const newItem = await this.menuItemService.createMenuItem(
      restaurantId,
      data,
      currentUserId
    );

    this.renderJson(
      {
        success: true,
        message: "Thêm món ăn thành công",
        data: newItem,
      },
      201
    );
  }

  
  async update() {
    const menuItemId = this.req.params.menuItemId;
    const currentUserId = this.currentUser?.id;

    if (!currentUserId) {
      throw new UnauthorizedError("Cần đăng nhập để cập nhật món ăn");
    }

    const data = await this.params(UpdateMenuItemValidator).permit(
      "name",
      "description",
      "basePrice",
      "categoryId",
      "imageUrl",
      "isAvailable"
    );

    const updatedItem = await this.menuItemService.updateMenuItem(
      menuItemId,
      data,
      currentUserId
    );

    this.renderJson({
      success: true,
      message: "Cập nhật món ăn thành công",
      data: updatedItem,
    });
  }

 
  async updateAvailability() {
    const menuItemId = this.req.params.menuItemId;
    const currentUserId = this.currentUser?.id;

    if (!currentUserId) {
      throw new UnauthorizedError("Cần đăng nhập để cập nhật trạng thái");
    }

    const data = await this.params(UpdateMenuItemAvailabilityValidator).permit(
      "isAvailable",
      "reason"
    );

    const updatedItem = await this.menuItemService.updateAvailability(
      menuItemId,
      data.isAvailable,
      currentUserId,
      data.reason
    );

    this.renderJson({
      success: true,
      message: data.isAvailable ? "Bật hiển thị món ăn" : "Tạm ẩn món ăn thành công",
      data: updatedItem,
    });
  }


  async destroy() {
    const menuItemId = this.req.params.menuItemId;
    const currentUserId = this.currentUser?.id;

    if (!currentUserId) {
      throw new UnauthorizedError("Cần đăng nhập để xóa món ăn");
    }

    await this.menuItemService.deleteMenuItem(menuItemId, currentUserId);

    this.renderJson({
      success: true,
      message: "Xóa món ăn thành công",
    });
  }
}
