import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LedgerService } from "../ledger/ledger.service";
import { AuditLogService } from "../common/audit-log.service";
import { ledgerKit } from "../kits/ledger-kit";

@Injectable()
export class CashRemittancesService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private audit: AuditLogService,
  ) {}

  listAll() {
    return this.prisma.cashRemittance.findMany({
      include: { rider: { include: { user: { select: { fullName: true } } } } },
      orderBy: { createdAt: "desc" },
    });
  }

  listForRider(riderId: string) {
    return this.prisma.cashRemittance.findMany({
      where: { riderId },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Simulates the partner confirming the physical cash drop — moves partner_float → cash_in_transit out. */
  async confirm(remittanceId: string, actorId: string) {
    const rem = await this.prisma.cashRemittance.findUnique({ where: { id: remittanceId } });
    if (!rem) throw new NotFoundException("Remittance not found");
    if (rem.status !== "pending") throw new BadRequestException(`Remittance is ${rem.status}, not pending`);

    const partnerFloat = await this.ledger.ensureAccount({ type: "partner_float", ownerType: "meld", ownerId: null });
    const cashInTransit = await this.ledger.ensureAccount({
      type: "cash_in_transit",
      ownerType: "rider",
      ownerId: rem.riderId,
    });
    const kit = await ledgerKit();
    await this.ledger.post(
      kit.buildCashRemittedPosting({
        accounts: { partnerFloat, cashInTransit },
        remittanceId: rem.id,
        amountKobo: Number(rem.amountOwedKobo),
      }),
    );

    const updated = await this.prisma.cashRemittance.update({
      where: { id: remittanceId },
      data: { status: "reconciled", amountRemittedKobo: rem.amountOwedKobo, reconciledById: actorId, reconciledAt: new Date() },
    });
    await this.audit.record({
      actorId,
      action: "reconcile_remittance",
      entityType: "cash_remittance",
      entityId: remittanceId,
      detail: { amountKobo: Number(rem.amountOwedKobo) },
    });
    return updated;
  }

  async flag(remittanceId: string, actorId: string) {
    const rem = await this.prisma.cashRemittance.findUnique({ where: { id: remittanceId } });
    if (!rem) throw new NotFoundException("Remittance not found");
    if (rem.status === "reconciled") throw new BadRequestException("Cannot flag an already-reconciled remittance");

    const updated = await this.prisma.cashRemittance.update({ where: { id: remittanceId }, data: { status: "flagged" } });
    await this.audit.record({ actorId, action: "flag_remittance", entityType: "cash_remittance", entityId: remittanceId });
    return updated;
  }
}
