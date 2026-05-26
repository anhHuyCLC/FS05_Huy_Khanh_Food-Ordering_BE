import models from "@models";
import { randomUUID } from "crypto";
import { BadRequestError, NotFoundError, UnauthorizedError } from "ts-rails";

export class CartService {
  /**
   * Lấy tất cả carts của user hiện tại (mỗi nhà hàng 1 cart)
   */
  async getMyCarts(profileId: string) {
    const carts = await models.cart.findMany({
      where: { ownerId: profileId },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true,
          },
        },
        items: {
          include: {
            menuItem: {
              include: {
                optionGroups: {
                  include: { choices: true },
                },
              },
            },
            addedByUser: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return carts;
  }

  /**
   * Lấy cart theo ID
   */
  async getCart(cartId: string, profileId: string) {
    const cart = await models.cart.findUnique({
      where: { id: cartId },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            isActive: true,
            latitude: true,
            longitude: true,
          },
        },
        items: {
          include: {
            menuItem: {
              include: {
                optionGroups: {
                  include: { choices: true },
                },
              },
            },
            addedByUser: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundError("Giỏ hàng không tìm thấy");
    }

    // Chỉ owner hoặc group member mới được xem
    if (cart.ownerId !== profileId) {
      throw new UnauthorizedError("Bạn không có quyền xem giỏ hàng này");
    }

    return cart;
  }

  /**
   * Lấy cart theo session token (để chia sẻ group cart)
   */
  async getCartBySessionToken(sessionToken: string) {
    const cart = await models.cart.findUnique({
      where: { sessionToken },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            isActive: true,
            latitude: true,
            longitude: true,
          },
        },
        items: {
          include: {
            menuItem: {
              include: {
                optionGroups: {
                  include: { choices: true },
                },
              },
            },
            addedByUser: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundError("Giỏ hàng không tìm thấy hoặc đường dẫn chia sẻ không hợp lệ");
    }

    if (!cart.isGroupCart) {
      throw new UnauthorizedError("Giỏ hàng này không phải Group Cart");
    }

    return cart;
  }

  /**
   * Tạo cart mới hoặc lấy cart đã có cho nhà hàng
   */
  async getOrCreateCart(profileId: string, restaurantId: string, isGroupCart = false) {
    // Kiểm tra nhà hàng tồn tại
    const restaurant = await models.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, isActive: true },
    });

    if (!restaurant) {
      throw new NotFoundError("Nhà hàng không tìm thấy");
    }

    if (!restaurant.isActive) {
      throw new Error("Nhà hàng hiện không hoạt động");
    }

    // Kiểm tra đã có cart cho nhà hàng này chưa
    const existingCart = await models.cart.findFirst({
      where: {
        ownerId: profileId,
        restaurantId,
      },
      include: {
        restaurant: {
          select: { id: true, name: true, address: true, latitude: true, longitude: true },
        },
        items: {
          include: {
            menuItem: {
              include: {
                optionGroups: {
                  include: { choices: true },
                },
              },
            },
          },
        },
      },
    });

    if (existingCart) {
      return { cart: existingCart, created: false };
    }

    // Tạo cart mới
    const sessionToken = isGroupCart ? randomUUID() : null;

    const newCart = await models.cart.create({
      data: {
        ownerId: profileId,
        restaurantId,
        isGroupCart,
        sessionToken,
      },
      include: {
        restaurant: {
          select: { id: true, name: true, address: true, latitude: true, longitude: true },
        },
        items: {
          include: {
            menuItem: {
              include: {
                optionGroups: {
                  include: { choices: true },
                },
              },
            },
          },
        },
      },
    });

    return { cart: newCart, created: true };
  }

  private isDeepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    if (typeof obj1 !== "object" || obj1 === null || typeof obj2 !== "object" || obj2 === null) {
      return false;
    }
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) return false;
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.isDeepEqual(obj1[key], obj2[key])) return false;
    }
    return true;
  }

  /**
   * Thêm item vào cart
   */
  async addItem(
    cartId: string,
    profileId: string,
    data: {
      menuItemId: string;
      quantity: number;
      selectedOptions?: Record<string, any>;
      note?: string;
    }
  ) {
    if (data.quantity <= 0) {
      throw new BadRequestError("Số lượng không hợp lệ");
    }

    const [cart, menuItem] = await Promise.all([
      models.cart.findUnique({
        where: { id: cartId },
        select: {
          id: true,
          ownerId: true,
          isGroupCart: true,
          restaurantId: true,
        },
      }),

      models.menuItem.findUnique({
        where: { id: data.menuItemId },
        select: {
          id: true,
          restaurantId: true,
          isAvailable: true,
          name: true,
        },
      }),
    ]);

    if (!cart) {
      throw new NotFoundError("Giỏ hàng không tìm thấy");
    }

    if (!menuItem) {
      throw new NotFoundError("Món ăn không tìm thấy");
    }

    if (cart.ownerId !== profileId && !cart.isGroupCart) {
      throw new UnauthorizedError("Bạn không có quyền thêm món vào giỏ hàng này");
    }

    if (menuItem.restaurantId !== cart.restaurantId) {
      throw new BadRequestError("Món ăn không thuộc nhà hàng của giỏ hàng này");
    }

    if (!menuItem.isAvailable) {
      throw new BadRequestError(`Món "${menuItem.name}" hiện không có sẵn`);
    }

    const targetOptions = data.selectedOptions ?? {};

    return models.$transaction(async (tx) => {
      // Tìm các items có cùng cartId và menuItemId trong cart
      const existingItems = await tx.cartItem.findMany({
        where: {
          cartId,
          menuItemId: data.menuItemId,
        },
      });

      // So khớp xem đã có món với selectedOptions y hệt chưa
      const duplicateItem = existingItems.find((item) => {
        const existingOptions = (item.selectedOptions as Record<string, any>) || {};
        return this.isDeepEqual(existingOptions, targetOptions);
      });

      if (duplicateItem) {
        // Nếu trùng, gộp số lượng lại
        return tx.cartItem.update({
          where: { id: duplicateItem.id },
          data: {
            quantity: duplicateItem.quantity + data.quantity,
            note: data.note !== undefined ? data.note : duplicateItem.note,
          },
          include: {
            menuItem: {
              select: { id: true, name: true, basePrice: true, imageUrl: true },
            },
          },
        });
      }

      // Tạo cart item mới
      return tx.cartItem.create({
        data: {
          cartId,
          menuItemId: data.menuItemId,
          addedByUserId: profileId,
          quantity: data.quantity,
          selectedOptions: targetOptions,
          note: data.note ?? null,
        },
        include: {
          menuItem: {
            select: { id: true, name: true, basePrice: true, imageUrl: true },
          },
        },
      });
    });
  }

  /**
   * Cập nhật CartItem (số lượng, options, ghi chú)
   */
  async updateItem(
    cartItemId: string,
    profileId: string,
    data: {
      quantity?: number;
      selectedOptions?: Record<string, any>;
      note?: string;
    }
  ) {
    const cartItem = await models.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true,
        menuItem: {
          select: { id: true, isAvailable: true, name: true },
        },
      },
    });

    if (!cartItem) {
      throw new NotFoundError("Món trong giỏ hàng không tìm thấy");
    }

    // Chỉ owner cart hoặc người đã thêm món (group cart) mới được sửa
    const isCartOwner = cartItem.cart.ownerId === profileId;
    const isItemAdder = cartItem.addedByUserId === profileId;

    if (!isCartOwner && !isItemAdder) {
      throw new UnauthorizedError("Bạn không có quyền cập nhật món này");
    }

    if (!cartItem.menuItem.isAvailable) {
      throw new Error(`Món "${cartItem.menuItem.name}" hiện không có sẵn`);
    }

    const targetOptions = JSON.parse(JSON.stringify(data.selectedOptions !== undefined ? data.selectedOptions : (cartItem.selectedOptions ?? {})));
    const targetQty = data.quantity !== undefined ? data.quantity : cartItem.quantity;
    const targetNote = data.note !== undefined ? data.note : cartItem.note;

    // Nếu thay đổi options, kiểm tra xem có trùng với item khác trong cùng giỏ hàng không
    if (data.selectedOptions !== undefined) {
      const otherItems = await models.cartItem.findMany({
        where: {
          cartId: cartItem.cartId,
          menuItemId: cartItem.menuItemId,
          id: { not: cartItemId },
        },
      });

      const duplicateItem = otherItems.find((item) => {
        const existingOptions = JSON.parse(JSON.stringify(item.selectedOptions ?? {}));
        return this.isDeepEqual(existingOptions, targetOptions);
      });

      if (duplicateItem) {
        // Gộp hai items: cộng dồn số lượng và xóa item hiện tại
        const updatedDuplicate = await models.cartItem.update({
          where: { id: duplicateItem.id },
          data: {
            quantity: duplicateItem.quantity + targetQty,
            note: targetNote || duplicateItem.note,
          },
          include: {
            menuItem: {
              select: { id: true, name: true, basePrice: true, imageUrl: true },
            },
          },
        });

        await models.cartItem.delete({
          where: { id: cartItemId },
        });

        return updatedDuplicate;
      }
    }

    const updateData: any = {};
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.selectedOptions !== undefined) updateData.selectedOptions = data.selectedOptions;
    if (data.note !== undefined) updateData.note = data.note;

    const updatedItem = await models.cartItem.update({
      where: { id: cartItemId },
      data: updateData,
      include: {
        menuItem: {
          select: { id: true, name: true, basePrice: true, imageUrl: true },
        },
      },
    });

    return updatedItem;
  }

  /**
   * Xóa một item khỏi cart
   */
  async removeItem(cartItemId: string, profileId: string) {
    const cartItem = await models.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!cartItem) {
      throw new NotFoundError("Món trong giỏ hàng không tìm thấy");
    }

    const isCartOwner = cartItem.cart.ownerId === profileId;
    const isItemAdder = cartItem.addedByUserId === profileId;

    if (!isCartOwner && !isItemAdder) {
      throw new UnauthorizedError("Bạn không có quyền xóa món này");
    }

    await models.cartItem.delete({ where: { id: cartItemId } });

    return { success: true, message: "Đã xóa món khỏi giỏ hàng" };
  }

  /**
   * Xóa toàn bộ items trong cart (clear cart)
   */
  async clearCart(cartId: string, profileId: string) {
    const cart = await models.cart.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new NotFoundError("Giỏ hàng không tìm thấy");
    }

    if (cart.ownerId !== profileId) {
      throw new UnauthorizedError("Bạn không có quyền xóa giỏ hàng này");
    }

    await models.cartItem.deleteMany({ where: { cartId } });

    return { success: true, message: "Đã xóa toàn bộ món trong giỏ hàng" };
  }

  /**
   * Xóa cart hoàn toàn
   */
  async deleteCart(cartId: string, profileId: string) {
    const cart = await models.cart.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new NotFoundError("Giỏ hàng không tìm thấy");
    }

    if (cart.ownerId !== profileId) {
      throw new UnauthorizedError("Bạn không có quyền xóa giỏ hàng này");
    }

    await models.cart.delete({ where: { id: cartId } });

    return { success: true, message: "Đã xóa giỏ hàng" };
  }

  /**
   * Tính tổng tiền của cart
   */
  async calculateCartTotal(cartId: string) {
    const items = await models.cartItem.findMany({
      where: { cartId },
      include: {
        menuItem: {
          select: { basePrice: true },
        },
      },
    });

    let subtotal = 0;

    for (const item of items) {
      const basePrice = Number(item.menuItem.basePrice);
      let optionTotal = 0;

      // Tính thêm tiền từ selected options (nếu có, hỗ trợ cả mảng/checkbox và object/radio)
      if (item.selectedOptions && typeof item.selectedOptions === "object") {
        const options = item.selectedOptions as Record<string, any>;
        for (const key of Object.keys(options)) {
          const optionValue = options[key];
          if (Array.isArray(optionValue)) {
            for (const choice of optionValue) {
              if (choice && typeof choice === "object" && choice.additionalPrice) {
                optionTotal += Number(choice.additionalPrice);
              }
            }
          } else if (optionValue && typeof optionValue === "object" && optionValue.additionalPrice) {
            optionTotal += Number(optionValue.additionalPrice);
          }
        }
      }

      subtotal += (basePrice + optionTotal) * item.quantity;
    }

    return {
      itemCount: items.length,
      totalQuantity: items.reduce((acc: any, i: any) => acc + i.quantity, 0),
      subtotal: Math.round(subtotal),
    };
  }

  /**
   * Tạo session token chia sẻ group cart
   */
  async generateShareToken(cartId: string, profileId: string) {
    const cart = await models.cart.findUnique({ where: { id: cartId } });

    if (!cart) {
      throw new NotFoundError("Giỏ hàng không tìm thấy");
    }

    if (cart.ownerId !== profileId) {
      throw new UnauthorizedError("Chỉ chủ giỏ hàng mới có thể chia sẻ");
    }

    if (cart.sessionToken) {
      return { sessionToken: cart.sessionToken };
    }

    const sessionToken = randomUUID();
    const updatedCart = await models.cart.update({
      where: { id: cartId },
      data: { isGroupCart: true, sessionToken },
    });

    return { sessionToken: updatedCart.sessionToken };
  }
}
