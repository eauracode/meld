import { Body, Controller, ForbiddenException, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/jwt.strategy";
import { CallerContextService } from "../common/caller-context.service";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";

@Controller("products")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(
    private products: ProductsService,
    private callerContext: CallerContextService,
  ) {}

  @Get("mine")
  @Roles("merchant")
  async listMine(@CurrentUser() user: RequestUser) {
    const merchantId = await this.callerContext.merchantIdFor(user.userId);
    if (!merchantId) throw new ForbiddenException("No merchant profile for this user");
    return this.products.listForMerchant(merchantId);
  }

  @Post()
  @Roles("merchant")
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateProductDto) {
    const merchantId = await this.callerContext.merchantIdFor(user.userId);
    if (!merchantId) throw new ForbiddenException("No merchant profile for this user");
    return this.products.create({ merchantId, ...dto });
  }

  @Get()
  @Roles("ops_agent", "ops_admin")
  listAll() {
    return this.products.listAll();
  }
}
