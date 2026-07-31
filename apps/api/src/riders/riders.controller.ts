import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/jwt.strategy";
import { RidersService } from "./riders.service";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { ApproveApplicationDto } from "./dto/approve-application.dto";
import { RejectApplicationDto } from "./dto/reject-application.dto";
import { UpdateRiderProfileDto } from "./dto/update-rider-profile.dto";

@Controller("riders")
export class RidersController {
  constructor(private riders: RidersService) {}

  /** Public — the marketing site's /riders form posts here directly. */
  @Post("applications")
  apply(@Body() dto: CreateApplicationDto) {
    return this.riders.apply(dto);
  }

  @Get("applications")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ops_agent", "ops_admin")
  listApplications(@Query("status") status?: "applied" | "approved" | "rejected") {
    return this.riders.listApplications(status);
  }

  @Post("applications/:id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ops_agent", "ops_admin")
  approveApplication(
    @Param("id") id: string,
    @Body() dto: ApproveApplicationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.riders.approve({ applicationId: id, email: dto.email, actorId: user.userId });
  }

  @Post("applications/:id/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ops_agent", "ops_admin")
  rejectApplication(@Param("id") id: string, @Body() dto: RejectApplicationDto, @CurrentUser() user: RequestUser) {
    return this.riders.reject(id, dto.reason, user.userId);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("rider")
  findOwn(@CurrentUser() user: RequestUser) {
    return this.riders.findOwn(user.userId);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("rider")
  updateOwn(@CurrentUser() user: RequestUser, @Body() dto: UpdateRiderProfileDto) {
    return this.riders.updateOwnProfile(user.userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ops_agent", "ops_admin")
  listRiders() {
    return this.riders.listRiders();
  }

  @Post(":id/suspend")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ops_agent", "ops_admin")
  suspend(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.riders.setStatus(id, "suspended", user.userId);
  }

  @Post(":id/reactivate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ops_agent", "ops_admin")
  reactivate(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.riders.setStatus(id, "active", user.userId);
  }
}
