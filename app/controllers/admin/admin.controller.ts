import { ApplicationController } from "../application.controller";

export class AdminController extends ApplicationController {
  async index() {
    this.redirect("/admin/users");
  }
}
