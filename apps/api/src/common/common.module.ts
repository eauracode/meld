import { Global, Module } from "@nestjs/common";
import { CallerContextService } from "./caller-context.service";
import { AuditLogService } from "./audit-log.service";
import { AuditLogController } from "./audit-log.controller";

@Global()
@Module({
  controllers: [AuditLogController],
  providers: [CallerContextService, AuditLogService],
  exports: [CallerContextService, AuditLogService],
})
export class CommonModule {}
