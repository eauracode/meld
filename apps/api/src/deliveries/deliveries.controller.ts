import { Body, Controller, ForbiddenException, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/jwt.strategy";
import { CallerContextService } from "../common/caller-context.service";
import { DeliveriesService } from "./deliveries.service";
import { AssignRiderDto } from "./dto/assign-rider.dto";
import { FailDeliveryDto } from "./dto/fail-delivery.dto";
import { MarkCashCollectedDto } from "./dto/mark-cash-collected.dto";

@Controller("deliveries")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveriesController {
  constructor(
    private deliveries: DeliveriesService,
    private callerContext: CallerContextService,
  ) {}

  private async caller(user: RequestUser) {
    const isOps = user.role === "ops_agent" || user.role === "ops_admin";
    const riderId = user.role === "rider" ? await this.callerContext.riderIdFor(user.userId) : null;
    if (user.role === "rider" && !riderId) throw new ForbiddenException("No rider profile for this user");
    return { isOps, riderId };
  }

  @Post("assign")
  @Roles("ops_agent", "ops_admin")
  assign(@Body() dto: AssignRiderDto, @CurrentUser() user: RequestUser) {
    return this.deliveries.assign({ orderId: dto.orderId, riderId: dto.riderId, actorId: user.userId });
  }

  @Post(":id/accept")
  @Roles("rider", "ops_agent", "ops_admin")
  async accept(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.deliveries.accept(id, await this.caller(user));
  }

  @Post(":id/en-route")
  @Roles("rider", "ops_agent", "ops_admin")
  async startEnRoute(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.deliveries.startEnRoute(id, await this.caller(user));
  }

  @Post(":id/arrived")
  @Roles("rider", "ops_agent", "ops_admin")
  async markArrived(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.deliveries.markArrived(id, await this.caller(user));
  }

  @Post(":id/fail")
  @Roles("rider", "ops_agent", "ops_admin")
  async fail(@Param("id") id: string, @Body() dto: FailDeliveryDto, @CurrentUser() user: RequestUser) {
    const caller = await this.caller(user);
    return this.deliveries.fail(id, dto.reason, { ...caller, actorId: user.userId });
  }

  /**
   * THE PAYMENT GATE. No other endpoint can set a delivery to 'delivered' —
   * DeliveriesService.complete() re-derives payment_status/cash_collected
   * from the database row itself, never trusting this request.
   */
  @Post(":id/complete")
  @Roles("rider", "ops_agent", "ops_admin")
  async complete(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.deliveries.complete(id, await this.caller(user));
  }

  @Post(":id/cash-collected")
  @Roles("rider")
  async markCashCollected(
    @Param("id") id: string,
    @Body() dto: MarkCashCollectedDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.deliveries.markCashCollected(id, dto.amountKobo, await this.caller(user));
  }
}
