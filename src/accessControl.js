const accessPaths = {
  full: null,
  management: new Set([
    "/dashboard",
    "/students",
    "/parents",
    "/attendance",
    "/announcements",
    "/messages",
    "/notifications",
    "/reports",
    "/incidents",
    "/settings",
    "/members",
  ]),
  transport: new Set([
    "/dashboard",
    "/drivers",
    "/vehicles",
    "/routes",
    "/trips",
    "/tracking",
    "/notifications",
    "/settings",
  ]),
  academic: new Set([
    "/dashboard",
    "/students",
    "/parents",
    "/messages",
    "/attendance",
    "/announcements",
    "/reports",
    "/settings",
  ]),
  support: new Set([
    "/dashboard",
    "/messages",
    "/notifications",
    "/incidents",
    "/settings",
    "/messages",
  ]),
  read_only: new Set([
    "/dashboard",
    "/settings",
    "/messages",
    "/notifications",
    "/incidents",
    "/attendance",
  ]),
};

export const canAccessPath = (accessLevel, path) => {
  if (!accessLevel || accessLevel === "full") return true;
  return accessPaths[accessLevel]?.has(path) ?? false;
};

export const canManageUsers = (accessLevel) =>
  accessLevel === "full" || accessLevel === "management";

export default accessPaths;
