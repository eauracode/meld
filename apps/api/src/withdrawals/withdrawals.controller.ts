import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/jwt.strategy";
import { CallerContextService } from "../common/caller-context.service";
import { WithdrawalsService } from "./withdrawals.service";
import { RequestWithdrawalDto } from "./dto/request-withdrawal.dto";
import { FailWithdrawalDto } from "./dto/fail-withdrawal.dto";

@Controller("withdrawals")
@UseGuards(JwtAuthGuard, RolesGuard)
export class WithdrawalsController {
  constructor(
    private withdrawals: WithdrawalsService,
    private callerContext: CallerContextService,
  ) {}

  @Post()
  @Roles("merchant", "rider")
  async request(@Body() dto: RequestWithdrawalDto, @CurrentUser() user: RequestUser) {
    if (user.role === "merchant") {
      const merchantId = await this.callerContext.merchantIdFor(user.userId);
      if (!merchantId) throw new ForbiddenException("No merchant profile for this user");
      return this.withdrawals.request({ ownerType: "merchant", ownerId: merchantId, amountKobo: dto.amountKobo });
    }
    const riderId = await this.callerContext.riderIdFor(user.userId);
    if (!riderId) throw new ForbiddenException("No rider profile for this user");
    return this.withdrawals.request({ ownerType: "rider", ownerId: riderId, amountKobo: dto.amountKobo });
  }

  @Get("mine")
  @Roles("merchant", "rider")
  async listMine(@CurrentUser() user: RequestUser) {
    if (user.role === "merchant") {
      const merchantId = await this.callerContext.merchantIdFor(user.userId);
      if (!merchantId) throw new ForbiddenException("No merchant profile for this user");
      return this.withdrawals.listForOwner("merchant", merchantId);
    }
    const riderId = await this.callerContext.riderIdFor(user.userId);
    if (!riderId) throw new ForbiddenException("No rider profile for this user");
    return this.withdrawals.listForOwner("rider", riderId);
  }

  @Get("balance")
  @Roles("merchant", "rider")
  async balance(@CurrentUser() user: RequestUser) {
    if (user.role === "merchant") {
      const merchantId = await this.callerContext.merchantIdFor(user.userId);
      if (!merchantId) throw new ForbiddenException("No merchant profile for this user");
      return this.withdrawals.balance("merchant", merchantId);
    }
    const riderId = await this.callerContext.riderIdFor(user.userId);
    if (!riderId) throw new ForbiddenException("No rider profile for this user");
    return this.withdrawals.balance("rider", riderId);
  }

  @Get()
  @Roles("ops_agent", "ops_admin")
  listAll() {
    return this.withdrawals.listAll();
  }

  @Post(":id/process")
  @Roles("ops_admin")
  process(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.withdrawals.process(id, user.userId);
  }

  @Post(":id/fail")
  @Roles("ops_admin")
  fail(@Param("id") id: string, @Body() dto: FailWithdrawalDto, @CurrentUser() user: RequestUser) {
    return this.withdrawals.fail(id, dto.reason, user.userId);
  }

  @Post(":id/retry")
  @Roles("ops_agent", "ops_admin")
  retry(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.withdrawals.retry(id, user.userId);
  }
}
