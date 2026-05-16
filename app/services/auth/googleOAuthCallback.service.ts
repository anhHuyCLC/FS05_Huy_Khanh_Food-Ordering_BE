import { PasswordType, UserStatus } from "@configs/db/enums";
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
  async execute(code: string, redirectUri?: string): Promise<GoogleOAuthCallbackResult> {
    let access_token: string;
    try {
      const { data } = await axios.post("https://oauth2.googleapis.com/token", {
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        code,
        redirect_uri: redirectUri || env.googleRedirectUri,
        grant_type: "authorization_code",
      });
      access_token = data.access_token;
    } catch (error: any) {
      console.error("[Google OAuth] Token exchange failed:", error.response?.data || error.message);
      const details = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      throw new Error(`Token exchange failed. Details: ${details}`);
    }

    // 2. Get user info from Google
    let googleUser: GoogleUser;
    try {
      const { data } = await axios.get("https://www.googleapis.com/oauth2/v1/userinfo", {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      googleUser = data as GoogleUser;
    } catch (error: any) {
      console.error("[Google OAuth] Fetch user info failed:", error.response?.data || error.message);
      throw new Error("Failed to fetch user info from Google.");
    }

    // 2.5 Ensure CUSTOMER role exists (fix for missing role error)
    let customerRole = await this.models.role.findFirst({
      where: { code: "CUSTOMER", deleted: false },
    });

    if (!customerRole) {
      customerRole = await this.models.role.create({
        data: {
          code: "CUSTOMER",
          name: "Customer",
          description: "Standard user role for customers",
          isReadOnly: true,
        },
      });
      console.log("[GoogleOAuthCallback] Created missing CUSTOMER role");
    }

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
          status: UserStatus.ACTIVE,
          googleId: googleUser.id,
          roles: {
            create: [{ roleId: customerRole.id }],
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

      // Ensure user has CUSTOMER role (assign if not already assigned)
      const hasCustomerRole = user.roles.some(
        (r: { role: { code: string } }) => r.role.code === "CUSTOMER",
      );

      if (!hasCustomerRole) {
        await this.models.userToRole.create({
          data: {
            userId: user.id,
            roleId: customerRole.id,
          },
        });

        // Refresh user data with roles
        user = await this.models.user.findUnique({
          where: { id: user.id },
          include: { roles: { include: { role: true } } },
        }) as any;
      }
    }

    if (!user) {
      throw new Error("Failed to find or create user");
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
          type: PasswordType.REFRESH_TOKEN,
        },
      }),
      this.models.password.create({
        data: {
          userId: user.id,
          password: refreshToken,
          type: PasswordType.REFRESH_TOKEN,
        },
      }),
    ]);

    // 6. Return clean response to FE
    const { roles: _, ...userWithoutRoles } = user;
    return {
      accessToken,
      refreshToken,
      user: {
        ...userWithoutRoles,
        fullName: `${user.firstName} ${user.lastName}`,
        roles: userRoles,
      },
    };
  }
}
