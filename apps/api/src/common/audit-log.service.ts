import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { Prisma } from "@prisma/client";

/** Every sensitive Ops action writes here (05_PRD_Ops FR-2). */
@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async record(input: {
    actorId: string | null;
    action: string;
    entityType?: string;
    entityId?: string;
    detail?: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        detail: input.detail,
      },
    });
  }
}
