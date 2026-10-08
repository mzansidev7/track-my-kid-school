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
    "/support",
    "/settings",
    "/members",
    "/billing",
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
    "/support",
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
    "/support",
  ]),
  support: new Set([
    "/dashboard",
    "/messages",
    "/notifications",
    "/incidents",
    "/support",
    "/settings",
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

const billingExceptionPaths = new Set(["/billing"]);

export const isSchoolTrialExpiredWithoutPaidSubscription = (billing) => {
  if (billing?.trial?.status !== "expired") return false;

  const subscription = billing.subscription;
  if (!subscription) return true;

  if (subscription.billing_status === "active") return false;

  if (
    subscription.billing_status === "past_due" &&
    subscription.grace_period_ends_at &&
    new Date(subscription.grace_period_ends_at).getTime() > Date.now()
  ) {
    return false;
  }

  return !(
    subscription.billing_status === "canceled" &&
    subscription.current_period_end &&
    new Date(subscription.current_period_end).getTime() > Date.now()
  );
};

export const canAccessDuringExpiredTrial = (path) =>
  billingExceptionPaths.has(path);

export const canAccessPath = (accessLevel, path) => {
  if (!accessLevel || accessLevel === "full") return true;
  return accessPaths[accessLevel]?.has(path) ?? false;
};

export const canManageUsers = (accessLevel) =>
  accessLevel === "full" || accessLevel === "management";

export default accessPaths;
