import { Module } from "@nestjs/common";
import { RidersService } from "./riders.service";
import { RidersController } from "./riders.controller";
import { LedgerModule } from "../ledger/ledger.module";

@Module({
  imports: [LedgerModule],
  controllers: [RidersController],
  providers: [RidersService],
  exports: [RidersService],
})
export class RidersModule {}
