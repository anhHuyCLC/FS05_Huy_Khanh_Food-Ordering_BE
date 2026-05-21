import { CartControllerV1 } from "@controllers/api/v1/cart.controller";
import { action, RailsRoute } from "ts-rails";

export class CartRouteV1 extends RailsRoute {
  public draw() {
    // ─── Cart ──────────────────────────────────────────────────────────────

    // GET    /carts                    - Lấy danh sách carts của user
    this.get("/carts", action(CartControllerV1, "index"));

    // GET    /carts/share/:sessionToken - Xem group cart qua token (public)
    this.get("/carts/share/:sessionToken", action(CartControllerV1, "showByToken"));

    // GET    /carts/:cartId            - Lấy chi tiết một cart
    this.get("/carts/:cartId", action(CartControllerV1, "show"));

    // POST   /carts                    - Tạo hoặc lấy cart của nhà hàng
    this.post("/carts", action(CartControllerV1, "create"));

    // DELETE /carts/:cartId            - Xóa toàn bộ cart
    this.delete("/carts/:cartId", action(CartControllerV1, "destroy"));

    // DELETE /carts/:cartId/clear      - Xóa tất cả items (giữ cart)
    this.delete("/carts/:cartId/clear", action(CartControllerV1, "clear"));

    // GET    /carts/:cartId/total      - Tính tổng tiền giỏ hàng
    this.get("/carts/:cartId/total", action(CartControllerV1, "total"));

    // POST   /carts/:cartId/share      - Tạo link chia sẻ group cart
    this.post("/carts/:cartId/share", action(CartControllerV1, "share"));

    // ─── Cart Items ────────────────────────────────────────────────────────

    // POST   /carts/:cartId/items                         - Thêm món vào giỏ
    this.post("/carts/:cartId/items", action(CartControllerV1, "addItem"));

    // PATCH  /carts/:cartId/items/:cartItemId             - Cập nhật món trong giỏ
    this.patch("/carts/:cartId/items/:cartItemId", action(CartControllerV1, "updateItem"));

    // DELETE /carts/:cartId/items/:cartItemId             - Xóa món khỏi giỏ
    this.delete("/carts/:cartId/items/:cartItemId", action(CartControllerV1, "removeItem"));
  }
}
