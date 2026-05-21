import { FlashType } from "@configs/enum";
import { ApplicationController } from "./application.controller";

export class DevController extends ApplicationController {
  async index() {
    this.render("dev.view/index", { user: this.currentUser });
  }

  async create() {
    this.flash(FlashType.Success, { msg: this.t("flash.created") });
    this.redirect("/dev");
  }
}
