import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../common/prisma/prisma.module";
import { RuntimeModule } from "../common/runtime/runtime.module";
import { InboundWebhooksModule } from "../inbound-webhooks/inbound-webhooks.module";
import { INTEGRATION_ENV } from "../integrations/integration.types";
import { MetaTokenEncryptionService } from "../integrations/meta/meta-token-encryption.service";
import { WhatsappProvidersModule } from "../integrations/whatsapp-providers/whatsapp-providers.module";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { WhatsappInstancesController } from "./whatsapp-instances.controller";
import { WhatsappInstancesService } from "./whatsapp-instances.service";

/**
 * U2c follow-up: provisions WhatsappInstance rows (name, per-instance
 * encrypted token, webhook secret) so the Uazapi webhook routes in
 * webhooks.controller.ts have something to authenticate against. Imports
 * InboundWebhooksModule for UazapiConversionBridgeService, which it already
 * exports — no cycle back to this module (InboundWebhooksModule only imports
 * AuthModule/PrismaModule/RuntimeModule/ConversionRulesModule/
 * WorkspacesModule/WhatsappProvidersModule/BullModule).
 */
@Module({
  imports: [
    AuthModule,
    PrismaModule,
    RuntimeModule,
    WorkspacesModule,
    WhatsappProvidersModule,
    InboundWebhooksModule,
  ],
  controllers: [WhatsappInstancesController],
  providers: [
    WhatsappInstancesService,
    // MetaTokenEncryptionService/INTEGRATION_ENV are re-declared locally on
    // purpose, same duplicated pattern already used by
    // inbound-webhooks.module.ts and whatsapp-providers.module.ts.
    MetaTokenEncryptionService,
    { provide: INTEGRATION_ENV, useValue: process.env },
  ],
})
export class WhatsappInstancesModule {}
