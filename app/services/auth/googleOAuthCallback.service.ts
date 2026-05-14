import env from "@configs/env";
import { generateToken } from "@lib";
import models from "@models";
import axios from "axios";
import { ApplicationService } from "../application.service";

export type GoogleUser = {
  email: string;
  family_name: string;
  given_name: string;
  id: string;
  name: string;
  picture: string;
  verified_email: boolean;
};

export interface GoogleOAuthCallbackResult {
  accessToken: string;
  refreshToken: string;
  user: Awaited<ReturnType<typeof models.user.findUnique>> & {
    fullName: string;
    roles: string[];
  };
}

export class GoogleOAuthCallbackService extends ApplicationService {
  async execute(code: string): Promise<GoogleOAuthCallbackResult> {
    // 1. Exchange authorization code with Google
    const {
      data: { access_token },
    } = await axios.post("https://oauth2.googleapis.com/token", {
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      code,
      redirect_uri: env.googleRedirectUri,
      grant_type: "authorization_code",
    });

    // 2. Get user info from Google
    const { data: googleUser } = (await axios.get(
      "https://www.googleapis.com/oauth2/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
    )) as { data: GoogleUser };

    // 3. Find or create user
    let user = await this.models.user.findUnique({
      where: { email: googleUser.email },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      user = await this.models.user.create({
        data: {
          email: googleUser.email,
          firstName: googleUser.given_name || "",
          lastName: googleUser.family_name || "",
          avatarUrl: googleUser.picture || "",
          status: "ACTIVE",
          googleId: googleUser.id,
          roles: {
            create: [{ role: { connect: { code: "CUSTOMER" } } }],
          },
        },
        include: { roles: { include: { role: true } } },
      });
    } else {
      // Update user info from Google (Social Sync)
      user = await this.models.user.update({
        where: { id: user.id },
        data: {
          firstName: googleUser.given_name || user.firstName,
          lastName: googleUser.family_name || user.lastName,
          avatarUrl: googleUser.picture || user.avatarUrl,
          googleId: user.googleId || googleUser.id,
        },
        include: { roles: { include: { role: true } } },
      });
    }

    // 4. Generate JWT tokens
    const userRoles = user.roles.map(
      (r: { role: { code: string } }) => r.role.code,
    );

    const accessToken = generateToken(
      {
        id: user.id,
        roles: userRoles,
      },
      "1h",
    );

    const refreshToken = generateToken(
      {
        id: user.id,
      },
      "7d",
    );

    // 5. Save refresh token to DB
    await this.models.$transaction([
      this.models.password.deleteMany({
        where: {
          userId: user.id,
          type: "REFRESH_TOKEN",
        },
      }),
      this.models.password.create({
        data: {
          userId: user.id,
          password: refreshToken,
          type: "REFRESH_TOKEN",
        },
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        ...user,
        fullName: `${user.firstName} ${user.lastName}`,
        roles: userRoles,
      },
    };
  }
}
