import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/** Thin NestJS lifecycle wrapper around PrismaClient — one instance, DI-managed. */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    if (!process.env.DATABASE_URL) {
      this.logger.error(
        "DATABASE_URL is not set — the API cannot start without a reachable Postgres connection string. " +
          "See apps/api/.env.example.",
      );
      process.exit(1);
    }
    try {
      await this.$connect();
    } catch (err) {
      this.logger.error(`Failed to connect to Postgres at DATABASE_URL: ${(err as Error).message}`);
      process.exit(1);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
