import { NextFunction, Request, Response } from "express";
import { verifyToken } from "@lib";
import { JwtPayload } from "../../lib/utils/jwt";
import models from "@models";
import { ApplicationMiddleware } from "./application.middleware";

export class AuthMiddleware extends ApplicationMiddleware {
  public async execute(req: Request, res: Response, next: NextFunction) {
    try {
      const isApiRequest = req.originalUrl.includes("/api");
      if (!isApiRequest) {
        return next();
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        const t = (res.locals?.t as (k: string) => string) || ((k: string) => k);
        return res.status(401).json({ success: false, error: t("flash.login_first") });
      }

      const token = authHeader.split(" ")[1];
      let decoded: JwtPayload;
      
      try {
        decoded = verifyToken(token) as JwtPayload;
      } catch (jwtError) {
        return res.status(401).json({ success: false, error: "Invalid or expired token" });
      }

      if (!decoded || !decoded.sub) {
        return res.status(401).json({ success: false, error: "Invalid token payload" });
      }

      const user = await models.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true }
      });
      const tokenVersion = (user as any)?.tokenVersion || 1;

      if (!user || tokenVersion !== decoded.tokenVersion) {
        return res.status(401).json({ success: false, error: "Token has been revoked or is invalid. Please login again." });
      }

      req.user = {
        id: decoded.sub,
        email: decoded.email,
        roles: decoded.roles || [],
        permissions: decoded.permissions || [],
        tokenVersion: decoded.tokenVersion
      };

      next();
    } catch (error) {
      return res.status(500).json({ success: false, error: "Internal server error during authentication" });
    }
  }
}
