import { Module } from "@nestjs/common";
import { MerchantsService } from "./merchants.service";
import { MerchantsController } from "./merchants.controller";
import { LedgerModule } from "../ledger/ledger.module";

@Module({
  imports: [LedgerModule],
  controllers: [MerchantsController],
  providers: [MerchantsService],
  exports: [MerchantsService],
})
export class MerchantsModule {}
