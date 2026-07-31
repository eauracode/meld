import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogService } from "../common/audit-log.service";

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditLogService,
  ) {}

  async listWarehouses() {
    return this.prisma.warehouse.findMany({ orderBy: { name: "asc" } });
  }

  async registerWarehouse(input: { name: string; state: string; address?: string; actorId: string }) {
    const warehouse = await this.prisma.warehouse.create({
      data: { name: input.name, state: input.state, address: input.address },
    });
    await this.audit.record({
      actorId: input.actorId,
      action: "register_warehouse",
      entityType: "warehouse",
      entityId: warehouse.id,
      detail: { name: input.name, state: input.state },
    });
    return warehouse;
  }

  async listForMerchant(merchantId: string) {
    return this.prisma.inventory.findMany({
      where: { product: { merchantId } },
      include: { product: true, warehouse: true },
    });
  }

  async listAll() {
    return this.prisma.inventory.findMany({
      include: { product: { include: { merchant: { select: { businessName: true } } } }, warehouse: true },
    });
  }

  /** Mirrors receive_inventory() — upsert quantity + log the movement, audited. */
  async receive(input: { productId: string; warehouseId: string; quantity: number; actorId: string }) {
    if (input.quantity <= 0) throw new BadRequestException("Quantity must be positive");

    const [product, warehouse] = await Promise.all([
      this.prisma.product.findUnique({ where: { id: input.productId } }),
      this.prisma.warehouse.findUnique({ where: { id: input.warehouseId } }),
    ]);
    if (!product) throw new NotFoundException("Product not found");
    if (!warehouse) throw new NotFoundException("Warehouse not found");

    await this.prisma.$transaction(async (tx) => {
      await tx.inventory.upsert({
        where: { productId_warehouseId: { productId: input.productId, warehouseId: input.warehouseId } },
        update: { quantity: { increment: input.quantity } },
        create: { productId: input.productId, warehouseId: input.warehouseId, quantity: input.quantity },
      });
      await tx.stockMovement.create({
        data: {
          productId: input.productId,
          warehouseId: input.warehouseId,
          change: input.quantity,
          reason: "received",
          refType: "manual",
          createdById: input.actorId,
        },
      });
    });

    await this.audit.record({
      actorId: input.actorId,
      action: "receive_inventory",
      entityType: "product",
      entityId: input.productId,
      detail: { warehouseId: input.warehouseId, quantity: input.quantity },
    });
  }

  /** Mirrors adjust_stock() — bounds-checked, reason required, audited. */
  async adjust(input: { productId: string; warehouseId: string; change: number; reason: string; actorId: string }) {
    if (input.change === 0) throw new BadRequestException("Change must be non-zero");
    if (!input.reason?.trim()) throw new BadRequestException("A reason is required");

    await this.prisma.$transaction(async (tx) => {
      const row = await tx.inventory.findUnique({
        where: { productId_warehouseId: { productId: input.productId, warehouseId: input.warehouseId } },
      });
      if (!row || row.quantity + input.change < 0) {
        throw new BadRequestException("Adjustment would make stock negative");
      }
      await tx.inventory.update({
        where: { productId_warehouseId: { productId: input.productId, warehouseId: input.warehouseId } },
        data: { quantity: { increment: input.change } },
      });
      await tx.stockMovement.create({
        data: {
          productId: input.productId,
          warehouseId: input.warehouseId,
          change: input.change,
          reason: `adjustment: ${input.reason}`,
          refType: "manual",
          createdById: input.actorId,
        },
      });
    });

    await this.audit.record({
      actorId: input.actorId,
      action: "adjust_stock",
      entityType: "product",
      entityId: input.productId,
      detail: { warehouseId: input.warehouseId, change: input.change, reason: input.reason },
    });
  }

  async movementsForMerchant(merchantId: string) {
    return this.prisma.stockMovement.findMany({
      where: { product: { merchantId } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async movementsAll() {
    return this.prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}
