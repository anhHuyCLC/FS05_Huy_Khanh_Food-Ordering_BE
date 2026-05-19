import { User } from "@db";
import "express-session";
import "jsonwebtoken";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

declare module "jsonwebtoken" {
  export interface JwtPayload {
    userId?: string;
  }
}

declare global {
  namespace Express {
    export interface Request {
      validated?: unknown;
      requestId?: string;
    }
  }
}
