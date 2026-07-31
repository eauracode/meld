import { Controller, Get, Param, Post, Body, UseGuards, ForbiddenException } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/jwt.strategy";
import { CallerContextService } from "../common/caller-context.service";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";

@Controller("orders")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private orders: OrdersService,
    private callerContext: CallerContextService,
  ) {}

  @Post()
  @Roles("merchant")
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateOrderDto) {
    const merchantId = await this.callerContext.merchantIdFor(user.userId);
    if (!merchantId) throw new ForbiddenException("No merchant profile for this user");
    return this.orders.createForMerchant(merchantId, dto);
  }

  @Get("mine")
  @Roles("merchant")
  async listMine(@CurrentUser() user: RequestUser) {
    const merchantId = await this.callerContext.merchantIdFor(user.userId);
    if (!merchantId) throw new ForbiddenException("No merchant profile for this user");
    return this.orders.listForMerchant(merchantId);
  }

  @Get("assigned")
  @Roles("rider")
  async listAssigned(@CurrentUser() user: RequestUser) {
    const riderId = await this.callerContext.riderIdFor(user.userId);
    if (!riderId) throw new ForbiddenException("No rider profile for this user");
    return this.orders.listForRider(riderId);
  }

  @Get()
  @Roles("ops_agent", "ops_admin")
  listAll() {
    return this.orders.listAll();
  }

  @Get(":id")
  @Roles("merchant", "rider", "ops_agent", "ops_admin")
  async findOne(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    const order = await this.orders.findOne(id);
    if (user.role === "ops_agent" || user.role === "ops_admin") return order;

    if (user.role === "merchant") {
      const merchantId = await this.callerContext.merchantIdFor(user.userId);
      if (merchantId !== order.merchantId) throw new ForbiddenException("Not your order");
      return order;
    }

    // rider
    const riderId = await this.callerContext.riderIdFor(user.userId);
    if (!order.delivery || order.delivery.riderId !== riderId) {
      throw new ForbiddenException("Not your assigned delivery");
    }
    return order;
  }
}
