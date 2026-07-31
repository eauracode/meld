import { Module } from "@nestjs/common";
import { DemoRequestsController } from "./demo-requests.controller";

@Module({
  controllers: [DemoRequestsController],
})
export class DemoRequestsModule {}
