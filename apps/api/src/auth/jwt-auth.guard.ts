import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** Applied per-controller/route; validates the bearer JWT via JwtStrategy. */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
