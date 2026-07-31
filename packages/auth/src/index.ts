import type { UserRole } from "@meld/types";

/**
 * Role guards shared by all surfaces. These guard ROUTES for UX only —
 * Postgres RLS is the real security boundary (01_SHARED_FOUNDATIONS §3).
 */

export interface RoleHolder {
  role: UserRole;
}

export const OPS_ROLES: readonly UserRole[] = ["ops_agent", "ops_admin"];

export function hasRole(user: RoleHolder | null | undefined, ...roles: UserRole[]): boolean {
  return !!user && roles.includes(user.role);
}

export function isOps(user: RoleHolder | null | undefined): boolean {
  return hasRole(user, ...OPS_ROLES);
}

export function isOpsAdmin(user: RoleHolder | null | undefined): boolean {
  return hasRole(user, "ops_admin");
}

export class ForbiddenError extends Error {
  constructor(required: UserRole[]) {
    super(`Requires role: ${required.join(" or ")}`);
    this.name = "ForbiddenError";
  }
}

export function assertRole(user: RoleHolder | null | undefined, ...roles: UserRole[]): void {
  if (!hasRole(user, ...roles)) throw new ForbiddenError(roles);
}

/** Which app a user belongs in after sign-in. */
export function homeSurface(role: UserRole): "merchant" | "rider" | "ops" {
  switch (role) {
    case "merchant":
      return "merchant";
    case "rider":
      return "rider";
    case "ops_agent":
    case "ops_admin":
      return "ops";
  }
}
