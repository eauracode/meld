import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { RequestUser } from "./jwt.strategy";

/** `@CurrentUser() user: RequestUser` in a controller handler — never trust a request body's claims about identity. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestUser => {
  const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
  return request.user;
});
