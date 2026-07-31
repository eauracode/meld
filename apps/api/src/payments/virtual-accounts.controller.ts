import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/jwt.strategy";
import { CallerContextService } from "../common/caller-context.service";
import { VirtualAccountsService } from "./virtual-accounts.service";
import { GenerateVaDto } from "./dto/generate-va.dto";

@Controller("virtual-accounts")
@UseGuards(JwtAuthGuard, RolesGuard)
export class VirtualAccountsController {
  constructor(
    private virtualAccounts: VirtualAccountsService,
    private callerContext: CallerContextService,
  ) {}

  private async caller(user: RequestUser) {
    const isOps = user.role === "ops_agent" || user.role === "ops_admin";
    const riderId = user.role === "rider" ? await this.callerContext.riderIdFor(user.userId) : null;
    return { isOps, riderId };
  }

  @Post()
  @Roles("rider", "ops_agent", "ops_admin")
  async generate(@Body() dto: GenerateVaDto, @CurrentUser() user: RequestUser) {
    return this.virtualAccounts.generate({
      purpose: dto.purpose,
      referenceId: dto.referenceId,
      caller: await this.caller(user),
    });
  }

  @Get()
  @Roles("rider", "ops_agent", "ops_admin")
  async find(
    @Query("purpose") purpose: "delivery_payment" | "cash_remittance",
    @Query("referenceId") referenceId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.virtualAccounts.find({ purpose, referenceId, caller: await this.caller(user) });
  }
}
