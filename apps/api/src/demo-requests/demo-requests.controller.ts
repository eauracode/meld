import { Body, Controller, Post } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDemoRequestDto } from "./dto/create-demo-request.dto";

@Controller("demo-requests")
export class DemoRequestsController {
  constructor(private prisma: PrismaService) {}

  /** Public — the marketing site's /demo form posts here directly (02_PRD_Marketing FR-4). */
  @Post()
  create(@Body() dto: CreateDemoRequestDto) {
    return this.prisma.demoRequest.create({ data: dto });
  }
}
