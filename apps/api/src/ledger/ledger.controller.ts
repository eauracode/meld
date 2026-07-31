import { BadRequestException, Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/jwt.strategy";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogService } from "../common/audit-log.service";
import { LedgerService } from "./ledger.service";
import { CreateAdjustmentDto } from "./dto/create-adjustment.dto";

@Controller("ledger")
@UseGuards(JwtAuthGuard, RolesGuard)
export class LedgerController {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private audit: AuditLogService,
  ) {}

  /** For the manual-adjustment picker — every account with a human-readable label. */
  @Get("accounts")
  @Roles("ops_agent", "ops_admin")
  async listAccounts() {
    const accounts = await this.prisma.ledgerAccount.findMany({ orderBy: { createdAt: "asc" } });
    const merchantIds = accounts.filter((a) => a.ownerType === "merchant").map((a) => a.ownerId!);
    const riderIds = accounts.filter((a) => a.ownerType === "rider").map((a) => a.ownerId!);
    const [merchants, riders] = await Promise.all([
      this.prisma.merchant.findMany({ where: { id: { in: merchantIds } }, select: { id: true, businessName: true } }),
      this.prisma.rider.findMany({
        where: { id: { in: riderIds } },
        select: { id: true, user: { select: { fullName: true } } },
      }),
    ]);
    const merchantName = new Map(merchants.map((m) => [m.id, m.businessName]));
    const riderName = new Map(riders.map((r) => [r.id, r.user.fullName]));

    return Promise.all(
      accounts.map(async (a) => ({
        id: a.id,
        type: a.type,
        ownerType: a.ownerType,
        ownerId: a.ownerId,
        ownerName:
          a.ownerType === "merchant"
            ? (merchantName.get(a.ownerId ?? "") ?? a.ownerId)
            : a.ownerType === "rider"
              ? (riderName.get(a.ownerId ?? "") ?? a.ownerId)
              : "MELD",
        balanceKobo: await this.ledger.getNormalBalance(a.id, a.type),
      })),
    );
  }

  /** All ledger transactions with their entries — the ops "raw ledger" feed. */
  @Get("transactions")
  @Roles("ops_agent", "ops_admin")
  listTransactions() {
    return this.prisma.ledgerTransaction.findMany({
      include: { entries: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  /** Sum of ALL entries ever posted (not just the 200 shown) — the true double-entry integrity check. */
  @Get("totals")
  @Roles("ops_agent", "ops_admin")
  async totals() {
    const agg = await this.prisma.ledgerEntry.aggregate({ _sum: { debitKobo: true, creditKobo: true } });
    return { debitKobo: Number(agg._sum.debitKobo ?? 0n), creditKobo: Number(agg._sum.creditKobo ?? 0n) };
  }

  /** Manual double-entry adjustment — ops_admin only, reason required, always balanced (05_PRD_Ops FR-5). */
  @Post("adjustments")
  @Roles("ops_admin")
  async adjust(@Body() dto: CreateAdjustmentDto, @CurrentUser() user: RequestUser) {
    if (dto.debitAccountId === dto.creditAccountId) {
      throw new BadRequestException("Debit and credit accounts must differ");
    }
    const transactionId = await this.ledger.post({
      sourceType: "adjustment",
      sourceId: null,
      memo: `Manual adjustment: ${dto.reason}`,
      createdBy: user.userId,
      entries: [
        { accountId: dto.debitAccountId, debitKobo: dto.amountKobo },
        { accountId: dto.creditAccountId, creditKobo: dto.amountKobo },
      ],
    });
    await this.audit.record({
      actorId: user.userId,
      action: "manual_adjustment",
      entityType: "ledger_transaction",
      entityId: transactionId,
      detail: { amountKobo: dto.amountKobo, reason: dto.reason },
    });
    return { ok: true, transactionId };
  }
}
