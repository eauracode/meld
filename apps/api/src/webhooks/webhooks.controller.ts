import { Body, Controller, Headers, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { WebhooksService } from "./webhooks.service";
import { SimulatePaymentDto } from "./dto/simulate-payment.dto";

@Controller("webhooks")
export class WebhooksController {
  constructor(private webhooks: WebhooksService) {}

  /**
   * No auth guard — the caller is the payment partner, not a MELD user; the
   * signature check inside WebhooksService IS the auth. Requires the raw
   * request body (see main.ts's express.raw() wiring for this exact path) —
   * signature verification needs the exact bytes the partner signed, not a
   * re-serialized JSON.parse() round-trip.
   */
  @Post("payment")
  async payment(@Req() req: Request, @Headers("x-paystack-signature") paystackSig?: string, @Headers("verif-hash") flutterwaveSig?: string) {
    const rawBody = (req.body as Buffer).toString("utf8");
    const signature = paystackSig ?? flutterwaveSig ?? "";
    return this.webhooks.handlePaymentWebhook(rawBody, signature);
  }

  /** Dev/demo only — see WebhooksService.simulatePayment. Refuses to run unless the mock provider is active. */
  @Post("simulate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("rider", "ops_agent", "ops_admin")
  simulate(@Body() dto: SimulatePaymentDto) {
    return this.webhooks.simulatePayment(dto);
  }
}
