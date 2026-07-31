import { Module } from "@nestjs/common";
import { PrismaLedgerStore } from "./prisma-ledger-store";
import { LedgerService } from "./ledger.service";
import { LedgerController } from "./ledger.controller";

@Module({
  controllers: [LedgerController],
  providers: [PrismaLedgerStore, LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
