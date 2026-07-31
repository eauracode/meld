import { Controller, ForbiddenException, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/jwt.strategy";
import { CallerContextService } from "../common/caller-context.service";
import { CashRemittancesService } from "./cash-remittances.service";

@Controller("cash-remittances")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ops_agent", "ops_admin")
export class CashRemittancesController {
  constructor(
    private remittances: CashRemittancesService,
    private callerContext: CallerContextService,
  ) {}

  @Get()
  listAll() {
    return this.remittances.listAll();
  }

  @Get("mine")
  @Roles("rider")
  async listMine(@CurrentUser() user: RequestUser) {
    const riderId = await this.callerContext.riderIdFor(user.userId);
    if (!riderId) throw new ForbiddenException("No rider profile for this user");
    return this.remittances.listForRider(riderId);
  }

  @Post(":id/confirm")
  confirm(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.remittances.confirm(id, user.userId);
  }

  @Post(":id/flag")
  flag(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.remittances.flag(id, user.userId);
  }
}
