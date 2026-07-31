import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/jwt.strategy";
import { MerchantsService } from "./merchants.service";
import { ApproveMerchantDto } from "./dto/approve-merchant.dto";
import { UpdateMerchantProfileDto } from "./dto/update-merchant-profile.dto";

@Controller("merchants")
@UseGuards(JwtAuthGuard, RolesGuard)
export class MerchantsController {
  constructor(private merchants: MerchantsService) {}

  @Get("me")
  @Roles("merchant")
  findOwn(@CurrentUser() user: RequestUser) {
    return this.merchants.findOwn(user.userId);
  }

  @Patch("me")
  @Roles("merchant")
  updateOwn(@CurrentUser() user: RequestUser, @Body() dto: UpdateMerchantProfileDto) {
    return this.merchants.updateOwnProfile(user.userId, dto);
  }

  @Get("pending")
  @Roles("ops_agent", "ops_admin")
  listPending() {
    return this.merchants.listPending();
  }

  @Get()
  @Roles("ops_agent", "ops_admin")
  listAll() {
    return this.merchants.listAll();
  }

  @Post(":id/approve")
  @Roles("ops_agent", "ops_admin")
  approve(@Param("id") id: string, @Body() dto: ApproveMerchantDto, @CurrentUser() user: RequestUser) {
    return this.merchants.approve({
      merchantId: id,
      feeBorneBy: dto.feeBorneBy,
      overrideFlatFeeKobo: dto.overrideFlatFeeKobo,
      actorId: user.userId,
    });
  }

  @Post(":id/suspend")
  @Roles("ops_agent", "ops_admin")
  suspend(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.merchants.setStatus(id, "suspended", user.userId);
  }

  @Post(":id/reactivate")
  @Roles("ops_agent", "ops_admin")
  reactivate(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.merchants.setStatus(id, "approved", user.userId);
  }
}
