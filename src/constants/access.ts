export const PROFILE_ROLES = ["client", "agent", "admin"] as const;
export type ProfileRole = (typeof PROFILE_ROLES)[number];
export type AccountStatus = "active" | "suspended";
