import "reflect-metadata";
import express from "express";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

const WEBHOOK_PATH = "/api/webhooks/payment";

// Prisma represents Postgres `bigint` columns (every kobo amount in this
// schema) as native JS BigInt, which JSON.stringify cannot serialize by
// default — found via a live test (order creation 500'd on response
// serialization, after the DB write had already succeeded). Kobo amounts
// are always far under Number.MAX_SAFE_INTEGER for any real transaction,
// matching how @meld/ledger's own public interface already treats Kobo as
// `number`, never `bigint` — so converting at the JSON boundary is safe and
// consistent, not a workaround.
(BigInt.prototype as unknown as { toJSON(): number }).toJSON = function (this: bigint) {
  return Number(this);
};

async function bootstrap() {
  // bodyParser: false — we wire JSON/raw parsing manually below so the
  // webhook route gets the exact raw bytes the partner signed, instead of a
  // JSON.parse()-and-reserialize round-trip that would break signature
  // verification.
  const app = await NestFactory.create(AppModule, { cors: true, bodyParser: false });

  app.use(WEBHOOK_PATH, express.raw({ type: "*/*" }));
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path === WEBHOOK_PATH) return next(); // already raw-parsed above
    return express.json()(req, res, next);
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix("api");
  const port = process.env.PORT ? Number(process.env.PORT) : 3090;
  await app.listen(port, "0.0.0.0");
  console.log(`MELD API listening on :${port}`);
}

bootstrap();
