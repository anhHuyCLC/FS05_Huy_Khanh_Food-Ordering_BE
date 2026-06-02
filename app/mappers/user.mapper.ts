export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  fullName: string;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  gender?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  profile?: {
    rewardPoints?: number;
    badgeLevel?: string;
    achievedBadges?: any[];
    missionProgresses?: any[];
  };
  roles: {
    code: string;
    name: string;
  }[];
  permissions: {
    code: string;
    name: string;
    feature?: string | null;
  }[];
  createdAt: string;
  updatedAt?: string | null;
}

export const mapUserToDto = (
  user: any,
  mergedPermissions: { code: string; name: string; feature?: string | null }[]
): UserDto => {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    fullName: [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" "),
    avatarUrl: user.avatarUrl,
    phoneNumber: user.phoneNumber,
    address: user.address,
    gender: user.gender,
    status: user.status,
    profile: user.profile ? {
      rewardPoints: user.profile.rewardPoints,
      badgeLevel: user.profile.badgeLevel,
      achievedBadges: user.profile.achievedBadges,
      missionProgresses: user.profile.missionProgresses
    } : undefined,
    roles: user.roles?.map((r: any) => ({
      code: r.role?.code,
      name: r.role?.name
    })) || [],
    permissions: mergedPermissions,
    createdAt: user.createdAt?.toISOString(),
    updatedAt: user.updatedAt?.toISOString()
  };
};
