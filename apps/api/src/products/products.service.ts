import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async listForMerchant(merchantId: string) {
    return this.prisma.product.findMany({ where: { merchantId }, orderBy: { createdAt: "desc" } });
  }

  async listAll() {
    return this.prisma.product.findMany({
      include: { merchant: { select: { businessName: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(input: { merchantId: string; sku?: string; name: string; reorderLevel?: number }) {
    if (input.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { merchantId: input.merchantId, sku: input.sku },
      });
      if (existing) throw new ConflictException(`SKU ${input.sku} already exists`);
    }
    return this.prisma.product.create({
      data: {
        merchantId: input.merchantId,
        sku: input.sku,
        name: input.name,
        reorderLevel: input.reorderLevel ?? 0,
      },
    });
  }
}
