import { Body, Controller, ForbiddenException, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/jwt.strategy";
import { CallerContextService } from "../common/caller-context.service";
import { InventoryService } from "./inventory.service";
import { RegisterWarehouseDto } from "./dto/register-warehouse.dto";
import { ReceiveInventoryDto } from "./dto/receive-inventory.dto";
import { AdjustStockDto } from "./dto/adjust-stock.dto";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(
    private inventory: InventoryService,
    private callerContext: CallerContextService,
  ) {}

  @Get("warehouses")
  @Roles("merchant", "rider", "ops_agent", "ops_admin")
  listWarehouses() {
    return this.inventory.listWarehouses();
  }

  @Post("warehouses")
  @Roles("ops_agent", "ops_admin")
  registerWarehouse(@Body() dto: RegisterWarehouseDto, @CurrentUser() user: RequestUser) {
    return this.inventory.registerWarehouse({ ...dto, actorId: user.userId });
  }

  @Get("inventory/mine")
  @Roles("merchant")
  async listMine(@CurrentUser() user: RequestUser) {
    const merchantId = await this.callerContext.merchantIdFor(user.userId);
    if (!merchantId) throw new ForbiddenException("No merchant profile for this user");
    return this.inventory.listForMerchant(merchantId);
  }

  @Get("inventory")
  @Roles("ops_agent", "ops_admin")
  listAll() {
    return this.inventory.listAll();
  }

  @Get("inventory/movements")
  @Roles("ops_agent", "ops_admin")
  movementsAll() {
    return this.inventory.movementsAll();
  }

  @Post("inventory/receive")
  @Roles("ops_agent", "ops_admin")
  receive(@Body() dto: ReceiveInventoryDto, @CurrentUser() user: RequestUser) {
    return this.inventory.receive({ ...dto, actorId: user.userId });
  }

  @Post("inventory/adjust")
  @Roles("ops_agent", "ops_admin")
  adjust(@Body() dto: AdjustStockDto, @CurrentUser() user: RequestUser) {
    return this.inventory.adjust({ ...dto, actorId: user.userId });
  }

  @Get("inventory/mine/movements")
  @Roles("merchant")
  async movements(@CurrentUser() user: RequestUser) {
    const merchantId = await this.callerContext.merchantIdFor(user.userId);
    if (!merchantId) throw new ForbiddenException("No merchant profile for this user");
    return this.inventory.movementsForMerchant(merchantId);
  }
}
