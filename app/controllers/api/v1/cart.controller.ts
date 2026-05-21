import models from "@models";
import { NotFoundError, UnauthorizedError } from "ts-rails";
import { ApiV1Controller } from "./apiV1.controller";
import { CartService } from "@services/cart.service";
import {
  AddCartItemValidator,
  CreateCartValidator,
  UpdateCartItemValidator,
} from "@validators/cart.validator";

export class CartControllerV1 extends ApiV1Controller {
  private cartService = new CartService();

  /**
   * Lấy profileId từ userId hiện tại (Profile.id === Profile.userId vì relation @id @map trùng nhau)
   * Trong schema: Profile.id === Profile.userId (tự join 1-1 với User qua userId)
   */
  private async getProfileId(): Promise<string> {
    const userId = this.currentUser?.id;
    if (!userId) throw new UnauthorizedError("Cần đăng nhập");

    let profile = await models.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    // Tự động tạo profile nếu chưa có
    if (!profile) {
      const user = await models.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      if (!user) throw new NotFoundError("User không tìm thấy");

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
   * GET /carts
   * Lấy tất cả carts của user hiện tại
   */
  async index() {
    const profileId = await this.getProfileId();

    const carts = await this.cartService.getMyCarts(profileId);

    this.renderJson({
      success: true,
      data: carts,
      count: carts.length,
    });
  }

  /**
   * GET /carts/:cartId
   * Lấy chi tiết một cart
   */
  async show() {
    const cartId = this.req.params.cartId;
    const profileId = await this.getProfileId();

    const cart = await this.cartService.getCart(cartId, profileId);

    this.renderJson({
      success: true,
      data: cart,
    });
  }

  /**
   * GET /carts/share/:sessionToken
   * Xem group cart qua session token (không cần đăng nhập)
   */
  async showByToken() {
    const sessionToken = this.req.params.sessionToken;

    const cart = await this.cartService.getCartBySessionToken(sessionToken);

    this.renderJson({
      success: true,
      data: cart,
    });
  }

  /**
   * POST /carts
   * Tạo cart mới hoặc lấy cart đã có cho nhà hàng
   */
  async create() {
    const profileId = await this.getProfileId();

    const data = await this.params(CreateCartValidator).permit(
      "restaurantId",
      "isGroupCart"
    );

    const result = await this.cartService.getOrCreateCart(
      profileId,
      data.restaurantId!,
      data.isGroupCart ?? false
    );

    this.renderJson(
      {
        success: true,
        message: result.created ? "Đã tạo giỏ hàng mới" : "Đã lấy giỏ hàng hiện có",
        data: result.cart,
      },
      result.created ? 201 : 200
    );
  }

  /**
   * DELETE /carts/:cartId
   * Xóa toàn bộ cart
   */
  async destroy() {
    const cartId = this.req.params.cartId;
    const profileId = await this.getProfileId();

    const result = await this.cartService.deleteCart(cartId, profileId);

    this.renderJson(result);
  }

  /**
   * DELETE /carts/:cartId/clear
   * Xóa tất cả items trong cart (giữ lại cart)
   */
  async clear() {
    const cartId = this.req.params.cartId;
    const profileId = await this.getProfileId();

    const result = await this.cartService.clearCart(cartId, profileId);

    this.renderJson(result);
  }

  /**
   * GET /carts/:cartId/total
   * Tính tổng tiền của cart
   */
  async total() {
    const cartId = this.req.params.cartId;
    const profileId = await this.getProfileId();

    // Verify cart belongs to user
    await this.cartService.getCart(cartId, profileId);

    const totals = await this.cartService.calculateCartTotal(cartId);

    this.renderJson({
      success: true,
      data: totals,
    });
  }

  /**
   * POST /carts/:cartId/share
   * Tạo session token để chia sẻ group cart
   */
  async share() {
    const cartId = this.req.params.cartId;
    const profileId = await this.getProfileId();

    const result = await this.cartService.generateShareToken(cartId, profileId);

    this.renderJson({
      success: true,
      message: "Tạo link chia sẻ thành công",
      data: result,
    });
  }

  // ─── Cart Items ───────────────────────────────────────────────────────────

  /**
   * POST /carts/:cartId/items
   * Thêm món vào giỏ hàng
   */
  async addItem() {
    const cartId = this.req.params.cartId;
    const profileId = await this.getProfileId();

    const data = await this.params(AddCartItemValidator).permit(
      "menuItemId",
      "quantity",
      "selectedOptions",
      "note"
    );

    const cartItem = await this.cartService.addItem(cartId, profileId, {
      menuItemId: data.menuItemId!,
      quantity: data.quantity!,
      selectedOptions: data.selectedOptions,
      note: data.note,
    });

    this.renderJson(
      {
        success: true,
        message: "Đã thêm món vào giỏ hàng",
        data: cartItem,
      },
      201
    );
  }

  /**
   * PATCH /carts/:cartId/items/:cartItemId
   * Cập nhật số lượng / ghi chú của item trong giỏ
   */
  async updateItem() {
    const cartItemId = this.req.params.cartItemId;
    const profileId = await this.getProfileId();

    const data = await this.params(UpdateCartItemValidator).permit(
      "quantity",
      "selectedOptions",
      "note"
    );

    const updatedItem = await this.cartService.updateItem(cartItemId, profileId, data);

    this.renderJson({
      success: true,
      message: "Đã cập nhật món trong giỏ hàng",
      data: updatedItem,
    });
  }

  /**
   * DELETE /carts/:cartId/items/:cartItemId
   * Xóa một item khỏi giỏ hàng
   */
  async removeItem() {
    const cartItemId = this.req.params.cartItemId;
    const profileId = await this.getProfileId();

    const result = await this.cartService.removeItem(cartItemId, profileId);

    this.renderJson(result);
  }
}
