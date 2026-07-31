import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { CommonModule } from "./common/common.module";
import { AuthModule } from "./auth/auth.module";
import { LedgerModule } from "./ledger/ledger.module";
import { FeeRulesModule } from "./fee-rules/fee-rules.module";
import { MerchantsModule } from "./merchants/merchants.module";
import { RidersModule } from "./riders/riders.module";
import { ProductsModule } from "./products/products.module";
import { InventoryModule } from "./inventory/inventory.module";
import { OrdersModule } from "./orders/orders.module";
import { DeliveriesModule } from "./deliveries/deliveries.module";
import { PaymentsModule } from "./payments/payments.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { WithdrawalsModule } from "./withdrawals/withdrawals.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { CashRemittancesModule } from "./cash-remittances/cash-remittances.module";
import { DemoRequestsModule } from "./demo-requests/demo-requests.module";

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    AuthModule,
    LedgerModule,
    FeeRulesModule,
    MerchantsModule,
    RidersModule,
    ProductsModule,
    InventoryModule,
    OrdersModule,
    DeliveriesModule,
    PaymentsModule,
    WebhooksModule,
    WithdrawalsModule,
    RealtimeModule,
    CashRemittancesModule,
    DemoRequestsModule,
  ],
})
export class AppModule {}
