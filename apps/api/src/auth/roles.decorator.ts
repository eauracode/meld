import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "@meld/types";

export const ROLES_KEY = "roles";

/** `@Roles("ops_agent", "ops_admin")` on a controller/handler — enforced by RolesGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
