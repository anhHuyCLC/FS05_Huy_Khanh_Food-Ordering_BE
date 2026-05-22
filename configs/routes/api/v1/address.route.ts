import { ApiV1AddressController } from "@controllers/api/v1/address.controller";
import { action, RailsRoute } from "ts-rails";

export class AddressRouteV1 extends RailsRoute {
  public draw() {
    // GET    /addresses     - Lấy danh sách địa chỉ đã lưu
    this.get("/addresses", action(ApiV1AddressController, "index"));

    // GET    /addresses/:id - Chi tiết một địa chỉ
    this.get("/addresses/:id", action(ApiV1AddressController, "show"));

    // POST   /addresses     - Thêm địa chỉ mới
    this.post("/addresses", action(ApiV1AddressController, "create"));

    // PATCH  /addresses/:id - Cập nhật địa chỉ
    this.patch("/addresses/:id", action(ApiV1AddressController, "update"));

    // DELETE /addresses/:id - Xóa địa chỉ đã lưu
    this.delete("/addresses/:id", action(ApiV1AddressController, "destroy"));
  }
}
