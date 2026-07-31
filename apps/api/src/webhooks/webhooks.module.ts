import { Module } from "@nestjs/common";
import { WebhooksService } from "./webhooks.service";
import { WebhooksController } from "./webhooks.controller";
import { LedgerModule } from "../ledger/ledger.module";
import { RealtimeModule } from "../realtime/realtime.module";

@Module({
  imports: [LedgerModule, RealtimeModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
