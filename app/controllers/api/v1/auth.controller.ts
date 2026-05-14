import { AuthGoogleVerifyService, AuthRefreshTokenService, GoogleOAuthCallbackService } from "@services";
import {
  GoogleOAuthCallbackValidator,
  GoogleVerifyValidator,
  RefreshTokenValidator,
} from "@validators/auth.validator";
import { ApiV1Controller } from ".";

export class AuthController extends ApiV1Controller {
  async googleVerify() {
    const { idToken } = await this.params(GoogleVerifyValidator).permit(
      "idToken",
    );
    const result = await new AuthGoogleVerifyService().execute(idToken);
    this.renderJson(result);
  }

  async googleOAuthCallback() {
    const { code } = await this.params(GoogleOAuthCallbackValidator).permit(
      "code",
    );
    const result = await new GoogleOAuthCallbackService().execute(code);
    this.renderJson(result);
  }

  async refreshToken() {
    const { refreshToken } = await this.params(RefreshTokenValidator).permit(
      "refreshToken",
    );

    // Gọi Service xử lý nghiệp vụ refresh
    const result = await new AuthRefreshTokenService().execute(refreshToken);

    this.renderJson(result);
  }
}
