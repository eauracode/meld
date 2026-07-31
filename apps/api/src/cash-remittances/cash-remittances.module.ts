import { Module } from "@nestjs/common";
import { LedgerModule } from "../ledger/ledger.module";
import { CashRemittancesController } from "./cash-remittances.controller";
import { CashRemittancesService } from "./cash-remittances.service";

@Module({
  imports: [LedgerModule],
  controllers: [CashRemittancesController],
  providers: [CashRemittancesService],
})
export class CashRemittancesModule {}
