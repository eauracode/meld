import { Module } from "@nestjs/common";
import { FeeRulesService } from "./fee-rules.service";
import { FeeRulesController } from "./fee-rules.controller";

@Module({
  controllers: [FeeRulesController],
  providers: [FeeRulesService],
  exports: [FeeRulesService],
})
export class FeeRulesModule {}
