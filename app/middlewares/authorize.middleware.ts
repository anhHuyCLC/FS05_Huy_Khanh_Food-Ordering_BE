import { NextFunction, Request, Response } from "express";
import { ApplicationMiddleware } from "./application.middleware";

export class AuthorizeMiddleware extends ApplicationMiddleware {
  private requiredPermission: string;

  constructor(requiredPermission: string) {
    super();
    this.requiredPermission = requiredPermission;
  }

  public async execute(req: Request, res: Response, next: NextFunction) {
    const user = req.user;

    if (!user) {
      const t = (res.locals?.t as (k: string) => string) || ((k: string) => k);
      return res.status(401).json({ success: false, error: t("flash.login_first") });
    }

    if (user.roles?.includes("SUPER_ADMIN")) {
      return next();
    }

    const reqPerm = this.requiredPermission.toUpperCase();
    if (!user.permissions?.map((p) => p.toUpperCase()).includes(reqPerm)) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: You don't have enough permission to perform this action.",
      });
    }

    next();
  }
}

// Helper to use in ts-rails routes
export const authorize = (permission: string) => {
  const m = new AuthorizeMiddleware(permission);
  return m.execute.bind(m);
};
