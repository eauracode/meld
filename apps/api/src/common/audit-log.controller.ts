import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Controller("audit-log")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles("ops_agent", "ops_admin")
  list() {
    return this.prisma.auditLog.findMany({
      include: { actor: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }
}
