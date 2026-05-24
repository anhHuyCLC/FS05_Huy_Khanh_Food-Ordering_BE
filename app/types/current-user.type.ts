export interface CurrentUser {
  id: string;
  profileId?: string;
  email: string;
  roles: string[];
  permissions: string[];
  tokenVersion: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: CurrentUser | null;
    }
  }
}
