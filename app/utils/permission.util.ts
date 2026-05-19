export const extractAndMergePermissions = (roles: any[], directPermissions: any[]): { code: string; name: string; feature?: string | null }[] => {
  const mergedPermissions = new Map<string, { code: string; name: string; feature?: string | null }>();

  // Extract from roles
  roles?.forEach(roleMapping => {
    roleMapping.role?.permissions?.forEach((rp: any) => {
      const featureCode = rp.permission?.feature?.code;
      const permCode = rp.permission?.code;
      
      if (featureCode && permCode) {
        const finalCode = `${featureCode}:${permCode}`;
        if (!mergedPermissions.has(finalCode)) {
          mergedPermissions.set(finalCode, {
            code: finalCode,
            name: rp.permission.name,
            feature: featureCode
          });
        }
      }
    });
  });

  // Extract from direct permissions
  directPermissions?.forEach(dp => {
    const featureCode = dp.permission?.feature?.code;
    const permCode = dp.permission?.code;
    
    if (featureCode && permCode) {
      const finalCode = `${featureCode}:${permCode}`;
      if (!mergedPermissions.has(finalCode)) {
        mergedPermissions.set(finalCode, {
          code: finalCode,
          name: dp.permission.name,
          feature: featureCode
        });
      }
    }
  });

  return Array.from(mergedPermissions.values());
};
