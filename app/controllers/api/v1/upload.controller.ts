import { ApiV1Controller } from "./apiV1.controller";
import { getStorageAdapter } from "@lib";
import { BadRequestError } from "ts-rails";

export class UploadControllerV1 extends ApiV1Controller {
  async upload() {
    if (!this.req.file) {
      throw new BadRequestError("Không tìm thấy file để tải lên");
    }

    try {
      const adapter = getStorageAdapter();
      const fileUrl = await adapter.upload(this.req.file);

      if (!fileUrl) {
        throw new BadRequestError("Tải file lên thất bại");
      }

      this.renderJson({
        url: fileUrl,
        filename: this.req.file.originalname,
        mimetype: this.req.file.mimetype,
      });
    } catch (error: any) {
      throw new BadRequestError(`Lỗi tải file: ${error.message || error}`);
    }
  }
}
