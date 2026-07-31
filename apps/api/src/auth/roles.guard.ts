import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { UserRole } from "@meld/types";
import { ROLES_KEY } from "./roles.decorator";
import type { RequestUser } from "./jwt.strategy";

/**
 * Must run AFTER JwtAuthGuard (request.user populated by then). The
 * function body — this guard, evaluated per request — IS the access
 * boundary now (no Postgres RLS underneath), matching the "the function body
 * IS the access boundary" note carried over from the Supabase-era SECURITY
 * DEFINER functions (01_SHARED_FOUNDATIONS §1 architecture update).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;
    return !!user && required.includes(user.role);
  }
}
