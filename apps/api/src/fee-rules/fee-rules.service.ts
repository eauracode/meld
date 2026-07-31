import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { feesKit } from "../kits/fees-kit";

const ENGINE_DEFAULT_FEE_KOBO = 250_000; // ₦2,500 — used only if no rule matches at all

@Injectable()
export class FeeRulesService {
  constructor(private prisma: PrismaService) {}

  async rulesFor(merchantId: string) {
    const rows = await this.prisma.feeRule.findMany({
      where: { OR: [{ scope: "global" }, { scope: "merchant", merchantId }] },
    });
    return rows.map((r) => ({
      id: r.id,
      scope: r.scope,
      merchantId: r.merchantId,
      type: r.type,
      intrastateFeeKobo: r.intrastateFeeKobo != null ? Number(r.intrastateFeeKobo) : null,
      byState: (r.byState as Record<string, number> | null) ?? null,
      fallbackFeeKobo: Number(r.fallbackFeeKobo),
      effectiveFrom: r.effectiveFrom.toISOString(),
      effectiveTo: r.effectiveTo ? r.effectiveTo.toISOString() : null,
    }));
  }

  /** Resolves the delivery fee for an order via @meld/fees — the ONLY place fee logic runs (golden rule). */
  async resolveFee(merchantId: string, originState: string, destinationState: string): Promise<number> {
    const rules = await this.rulesFor(merchantId);
    const kit = await feesKit();
    const result = kit.resolveDeliveryFee({
      merchantId,
      originState,
      destinationState,
      rules,
      defaultFeeKobo: ENGINE_DEFAULT_FEE_KOBO,
    });
    return result.feeKobo;
  }

  async setGlobalRule(input: {
    intrastateFeeKobo: number;
    byState: Record<string, number>;
    fallbackFeeKobo: number;
    createdById: string;
  }) {
    return this.prisma.feeRule.create({
      data: {
        scope: "global",
        type: "by_state",
        intrastateFeeKobo: BigInt(input.intrastateFeeKobo),
        byState: input.byState,
        fallbackFeeKobo: BigInt(input.fallbackFeeKobo),
        createdById: input.createdById,
      },
    });
  }

  async setMerchantOverride(input: { merchantId: string; flatFeeKobo: number; createdById: string }) {
    return this.prisma.feeRule.create({
      data: {
        scope: "merchant",
        merchantId: input.merchantId,
        type: "flat",
        intrastateFeeKobo: BigInt(input.flatFeeKobo),
        fallbackFeeKobo: BigInt(input.flatFeeKobo),
        createdById: input.createdById,
      },
    });
  }
}
