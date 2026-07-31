import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Resolves a user id → their merchant/rider row id. Replaces the
 * Supabase-era requireCaller() helper (supabase/functions/_shared/caller.ts)
 * — same principle: never trust a request body's claims about identity,
 * always resolve from the authenticated user id in the verified JWT.
 */
@Injectable()
export class CallerContextService {
  constructor(private prisma: PrismaService) {}

  async merchantIdFor(userId: string): Promise<string | null> {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId }, select: { id: true } });
    return merchant?.id ?? null;
  }

  async riderIdFor(userId: string): Promise<string | null> {
    const rider = await this.prisma.rider.findUnique({ where: { userId }, select: { id: true } });
    return rider?.id ?? null;
  }
}
