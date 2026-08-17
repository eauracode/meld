import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateOrderDto } from "./dto/create-order.dto";

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Delivery fee is intentionally NOT resolved here — Ops (dispatch) sets it
   * manually per order, together with the rider's payout, at assignment time
   * (`DeliveriesService.assign`). The order is created with both left null;
   * the merchant app shows "Calculating" until they're set.
   */
  async createForMerchant(merchantId: string, dto: CreateOrderDto) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException("Merchant not found");
    if (merchant.status !== "approved") {
      throw new ForbiddenException("Merchant is not approved — cannot create live orders");
    }

    // Resolve product names up front (and confirm every item belongs to this merchant).
    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.items.map((i) => i.productId) }, merchantId },
    });
    const productById = new Map(products.map((p) => [p.id, p]));
    for (const item of dto.items) {
      if (!productById.has(item.productId)) {
        throw new BadRequestException(`Product ${item.productId} does not belong to this merchant`);
      }
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          merchantId,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          deliveryAddress: dto.deliveryAddress,
          deliveryState: dto.deliveryState,
          deliveryArea: dto.deliveryArea,
          orderValueKobo: BigInt(dto.orderValueKobo),
          paymentType: dto.paymentType,
          feeBorneBy: merchant.feeBorneBy,
          status: "awaiting_assignment",
        },
      });

      for (const item of dto.items) {
        const product = productById.get(item.productId)!;
        await tx.orderItem.create({
          data: {
            orderId: created.id,
            productId: item.productId,
            nameSnapshot: product.name,
            quantity: item.quantity,
          },
        });
        await this.allocateStock(tx, item.productId, item.quantity, created.id);
      }

      return created;
    });

    return order;
  }

  /**
   * Decrements stock across warehouses (oldest-updated first), compare-and-
   * swap style — `quantity: { gte: take }` in the WHERE clause makes each
   * decrement atomic under Postgres's per-statement guarantees without
   * needing an explicit row lock, so concurrent orders can never oversell
   * the same stock. Mirrors allocate_stock() from the earlier Postgres design.
   */
  private async allocateStock(
    tx: Prisma.TransactionClient,
    productId: string,
    quantity: number,
    orderId: string,
  ): Promise<void> {
    let remaining = quantity;
    const rows = await tx.inventory.findMany({
      where: { productId, quantity: { gt: 0 } },
      orderBy: { updatedAt: "asc" },
    });

    for (const row of rows) {
      if (remaining <= 0) break;
      const take = Math.min(row.quantity, remaining);
      const result = await tx.inventory.updateMany({
        where: { id: row.id, quantity: { gte: take } },
        data: { quantity: { decrement: take } },
      });
      if (result.count === 0) continue; // lost the race for this row — move on

      await tx.stockMovement.create({
        data: {
          productId,
          warehouseId: row.warehouseId,
          change: -take,
          reason: "allocated",
          refType: "order",
          refId: orderId,
        },
      });
      remaining -= take;
    }

    if (remaining > 0) {
      throw new BadRequestException(`Not enough stock for product ${productId} (short by ${remaining})`);
    }
  }

  private readonly deliveryWithRider = {
    include: { rider: { include: { user: { select: { fullName: true, phone: true } } } } },
  } as const;

  async listForMerchant(merchantId: string) {
    return this.prisma.order.findMany({
      where: { merchantId },
      include: { items: true, delivery: this.deliveryWithRider },
      orderBy: { createdAt: "desc" },
    });
  }

  async listForRider(riderId: string) {
    return this.prisma.order.findMany({
      where: { delivery: { riderId } },
      include: { items: true, delivery: this.deliveryWithRider },
      orderBy: { createdAt: "desc" },
    });
  }

  async listAll() {
    return this.prisma.order.findMany({
      include: { items: true, delivery: this.deliveryWithRider, merchant: { select: { businessName: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, delivery: this.deliveryWithRider },
    });
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }
}
