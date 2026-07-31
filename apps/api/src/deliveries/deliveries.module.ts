import { Module } from "@nestjs/common";
import { DeliveriesService } from "./deliveries.service";
import { DeliveriesController } from "./deliveries.controller";
import { LedgerModule } from "../ledger/ledger.module";
import { RealtimeModule } from "../realtime/realtime.module";

@Module({
  imports: [LedgerModule, RealtimeModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
