import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/jwt.strategy";
import { PrismaService } from "../prisma/prisma.service";
import { CallerContextService } from "../common/caller-context.service";
import { FeeRulesService } from "./fee-rules.service";
import { SetGlobalRuleDto } from "./dto/set-global-rule.dto";
import { SetMerchantOverrideDto } from "./dto/set-merchant-override.dto";

@Controller("fee-rules")
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeeRulesController {
  constructor(
    private feeRules: FeeRulesService,
    private prisma: PrismaService,
    private callerContext: CallerContextService,
  ) {}

  @Get()
  @Roles("ops_agent", "ops_admin")
  list() {
    return this.prisma.feeRule.findMany({ orderBy: { effectiveFrom: "desc" } });
  }

  /** Global + own-override rules only — lets the merchant app run the real @meld/fees engine client-side for a live quote before submitting. */
  @Get("mine")
  @Roles("merchant")
  async mine(@CurrentUser() user: RequestUser) {
    const merchantId = await this.callerContext.merchantIdFor(user.userId);
    if (!merchantId) throw new ForbiddenException("No merchant profile for this user");
    return this.feeRules.rulesFor(merchantId);
  }

  /** Fee changes are ops_admin only (05_PRD_Ops §2.4) and versioned — never destructive. */
  @Post("global")
  @Roles("ops_admin")
  setGlobal(@Body() dto: SetGlobalRuleDto, @CurrentUser() user: RequestUser) {
    return this.feeRules.setGlobalRule({ ...dto, createdById: user.userId });
  }

  @Post("merchant/:merchantId")
  @Roles("ops_admin")
  setMerchantOverride(
    @Param("merchantId") merchantId: string,
    @Body() dto: SetMerchantOverrideDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.feeRules.setMerchantOverride({ merchantId, flatFeeKobo: dto.flatFeeKobo, createdById: user.userId });
  }
}
