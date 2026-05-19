/**
 * Auth routes - controller dùng params.permit().
 */
import { AuthController } from "@controllers/api";
import {
  GoogleOAuthCallbackValidator,
  GoogleVerifyValidator,
  RefreshTokenValidator,
  RegisterValidator,
} from "@validators/auth.validator";
import { action, RailsRoute } from "ts-rails";

import { AuthMiddleware } from "../../../../../app/middlewares/auth.middleware";

export class AuthRoute extends RailsRoute {
  public draw() {
    this.get("/me", [action(AuthMiddleware), action(AuthController, "me")], {
      document: {
        summary: "Get current user info",
        tags: ["Auth"],
        responses: {
          200: "Success",
          401: "Unauthorized",
        },
      },
    });
    this.post("/refresh-token", action(AuthController, "refreshToken"), {
      document: {
        summary: "Refresh token",
        tags: ["Auth"],
        body: RefreshTokenValidator,
        responses: {
          200: "Success",
          401: "Invalid token",
          422: "Validation failed",
        },
      },
    });

    this.post("/google/verify", action(AuthController, "googleVerify"), {
      document: {
        summary: "Verify Google ID token",
        tags: ["Auth"],
        body: GoogleVerifyValidator,
        responses: {
          200: "Success",
          401: "Invalid token",
          422: "Validation failed",
        },
      },
    });

    this.post("/google/callback", action(AuthController, "googleOAuthCallback"), {
      document: {
        summary: "Google OAuth callback - Exchange authorization code for tokens",
        tags: ["Auth"],
        body: GoogleOAuthCallbackValidator,
        responses: {
          200: "Success - returns accessToken, refreshToken, and user",
          401: "Invalid authorization code",
          422: "Validation failed",
        },
      },
    });
    this.post("/login", action(AuthController, "login"), {
      document: {
        summary: "User login with email and password",
        tags: ["Auth"],
        body: {
          type: "object",
          properties: { email: { type: "string" }, password: { type: "string" } },
          required: ["email", "password"],
        },
        responses: {
          200: "Success - returns accessToken, refreshToken, and user",
          401: "Invalid email or password",
          422: "Validation failed",
        },
      },
    });
    this.post("/register", action(AuthController, "register"), {
      document: {
        summary: "User registration",
        tags: ["Auth"],
        body: RegisterValidator,
        responses: {
          201: "Success - returns the created user",
          400: "Bad request - invalid input or email already in use",
          422: "Validation failed",
        },
      },
    });
  }
}
