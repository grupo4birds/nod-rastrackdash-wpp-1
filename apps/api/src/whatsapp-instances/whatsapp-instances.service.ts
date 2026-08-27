import { createHash, randomBytes } from "node:crypto";
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  WhatsappInstanceCreateResultDto,
  WhatsappInstanceDto,
  WhatsappInstanceRefreshResultDto,
  WhatsappInstanceStatusDto,
} from "@wpptrack/shared";
import { PrismaService } from "../common/prisma/prisma.service";
import { RUNTIME_ENV, type RuntimeEnv } from "../common/runtime/runtime.module";
import { parseInboundWebhooksConfig } from "../config/deployment-config";
import { UazapiConversionBridgeService } from "../inbound-webhooks/uazapi-conversion-bridge.service";
import { MetaTokenEncryptionService } from "../integrations/meta/meta-token-encryption.service";
import type { UazapiConnectionResult } from "../integrations/uazapi/uazapi.adapter";
import { UazapiAdapter } from "../integrations/uazapi/uazapi.adapter";

type PersistedWhatsappInstance = {
  id: string;
  workspaceId: string;
  name: string;
  status: string;
  providerInstanceId: string | null;
  providerTokenEncrypted: string | null;
  providerTokenIv: string | null;
  providerTokenTag: string | null;
  createdAt: Date;
};

/**
 * Closes the gap documented in docs/setup/whatsapp-providers.md: nothing in
 * the codebase ever created a WhatsappInstance row, so the two Uazapi
 * webhook routes (POST /webhooks/uazapi and
 * POST /webhooks/uazapi/instances/:instanceId) always returned 401. This
 * service generates the per-instance token/webhook secret, persists the row,
 * and drives UazapiAdapter's already-generic per-instance methods
 * (connectInstance/getInstanceStatus/configureInstanceWebhook/
 * deleteInstance) — it deliberately does not use
 * UazapiAdapter.createInstance(), which is a stub in this BYO edition.
 */
@Injectable()
export class WhatsappInstancesService {
  private readonly logger = new Logger(WhatsappInstancesService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RUNTIME_ENV) private readonly env: RuntimeEnv,
    @Inject(MetaTokenEncryptionService)
    private readonly tokenEncryption: MetaTokenEncryptionService,
    @Inject(UazapiAdapter) private readonly uazapiAdapter: UazapiAdapter,
    @Inject(UazapiConversionBridgeService)
    private readonly uazapiBridge: UazapiConversionBridgeService,
  ) {}

  async list(workspaceId: string): Promise<WhatsappInstanceDto[]> {
    const instances = await this.prisma.whatsappInstance.findMany({
      where: { workspaceId, provider: "uazapi" },
      orderBy: { createdAt: "desc" },
    });

    return instances.map((instance) => this.toDto(instance));
  }

  /**
   * The Uazapi instance itself is created on the workspace owner's own
   * Uazapi server dashboard (outside RastrackDash) — that already-existing
   * external tool hands back the instance's own token when it's created
   * there. RastrackDash never calls a Uazapi instance-creation endpoint
   * (there is no confirmed admin-token API for that, and
   * UAZAPI_ADMIN_TOKEN was deliberately removed from this BYO edition — see
   * UazapiAdapter.createInstance()); it only accepts that token as input and
   * drives the already-generic per-instance methods
   * (connectInstance/getInstanceStatus/configureInstanceWebhook) with it.
   * `providerInstanceId` below is purely RastrackDash's own local webhook
   * routing label — it is never sent to Uazapi (UazapiAdapter's
   * instanceRef parameter is only used as a fallback label when parsing the
   * response, never placed in the request URL/body), so it does not need to
   * match anything on the Uazapi side.
   */
  async create(
    workspaceId: string,
    name: string,
    instanceToken: string,
    actorUserId: string,
  ): Promise<WhatsappInstanceCreateResultDto> {
    const config = this.requireEnabledConfig();
    const providerInstanceId = `wa-${randomBytes(8).toString("hex")}`;
    const encryptedToken = this.tokenEncryption.encrypt(instanceToken);
    const webhookSecret = randomBytes(32).toString("base64url");
    const webhookTokenHash = this.hashToken(webhookSecret);

    const created = await this.prisma.$transaction(async (transaction) => {
      const instance = await transaction.whatsappInstance.create({
        data: {
          workspaceId,
          name,
          provider: "uazapi",
          providerInstanceId,
          providerTokenEncrypted: encryptedToken.encryptedAccessToken,
          providerTokenIv: encryptedToken.tokenIv,
          providerTokenTag: encryptedToken.tokenTag,
          webhookTokenHash,
          status: "disconnected",
        },
      });

      await this.createAudit(transaction, {
        workspaceId,
        actorUserId,
        action: "whatsapp_instance.created",
        targetId: instance.id,
        resultStatus: instance.status,
        beforeSummary: undefined,
        afterSummary: this.auditSummary(instance),
      });

      return instance;
    });

    // The plaintext token and webhook secret only ever exist in this method,
    // between generation and the calls below; they are never persisted or
    // returned again after this point (see MetaTokenEncryptionService for
    // what's stored instead).
    const webhookUrl = this.buildWebhookUrl(
      config.apiPublicUrl,
      created.id,
      webhookSecret,
    );

    await this.uazapiAdapter.configureInstanceWebhook({
      instanceToken,
      webhookUrl,
    });
    const connection = await this.uazapiAdapter.connectInstance(
      providerInstanceId,
      instanceToken,
    );

    return {
      id: created.id,
      status: this.mapConnectionStatus(connection.connectionStatus),
      qrCode: connection.qrCode,
      message: connection.message,
    };
  }

  async refresh(
    workspaceId: string,
    instanceId: string,
  ): Promise<WhatsappInstanceRefreshResultDto> {
    const instance = await this.requireInstance(workspaceId, instanceId);
    const token = this.decryptToken(instance);
    const connection = await this.uazapiAdapter.getInstanceStatus(
      instance.providerInstanceId ?? instance.id,
      token,
    );
    const status = this.mapConnectionStatus(connection.connectionStatus);

    if (status !== instance.status) {
      await this.prisma.whatsappInstance.update({
        where: { id: instance.id },
        data: { status },
      });
    }

    if (connection.connectionStatus === "connected") {
      // Best-effort: the lazy sync in
      // InboundWebhookConnectionsService.syncUazapiBridges is the safety
      // net, so a failure here just delays the bridge until the next
      // Settings load or webhook instead of failing this refresh.
      try {
        await this.uazapiBridge.ensureBridge({
          id: instance.id,
          workspaceId: instance.workspaceId,
          name: instance.name,
          providerInstanceId: instance.providerInstanceId,
          providerTokenEncrypted: instance.providerTokenEncrypted,
          providerTokenIv: instance.providerTokenIv,
          providerTokenTag: instance.providerTokenTag,
        });
      } catch (error) {
        this.logger.error(
          JSON.stringify({
            event: "whatsapp_instance_bridge_ensure_failed",
            workspaceId,
            whatsappInstanceId: instance.id,
            errorName: error instanceof Error ? error.name : "unknown",
          }),
        );
      }
    }

    return {
      status,
      qrCode: connection.qrCode,
      connectedPhone: connection.connectedPhone,
      message: connection.message,
    };
  }

  async remove(workspaceId: string, instanceId: string): Promise<void> {
    const instance = await this.requireInstance(workspaceId, instanceId);
    const token = this.decryptToken(instance);

    try {
      await this.uazapiAdapter.deleteInstance(token);
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: "whatsapp_instance_delete_remote_failed",
          workspaceId,
          whatsappInstanceId: instance.id,
          errorName: error instanceof Error ? error.name : "unknown",
        }),
      );
    }

    try {
      await this.prisma.whatsappInstance.delete({
        where: { id: instance.id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new ConflictException(
          "Nao e possivel remover: ja existe historico (leads ou etiquetas) vinculado a esta instancia",
        );
      }

      throw error;
    }
  }

  private async requireInstance(
    workspaceId: string,
    instanceId: string,
  ): Promise<PersistedWhatsappInstance> {
    const instance = await this.prisma.whatsappInstance.findFirst({
      where: { id: instanceId, workspaceId, provider: "uazapi" },
    });

    if (!instance) {
      throw new NotFoundException("Instancia WhatsApp nao encontrada");
    }

    return instance;
  }

  private decryptToken(instance: PersistedWhatsappInstance): string | null {
    if (
      !instance.providerTokenEncrypted ||
      !instance.providerTokenIv ||
      !instance.providerTokenTag
    ) {
      return null;
    }

    return this.tokenEncryption.decrypt({
      encryptedAccessToken: instance.providerTokenEncrypted,
      tokenIv: instance.providerTokenIv,
      tokenTag: instance.providerTokenTag,
    });
  }

  private mapConnectionStatus(
    status: UazapiConnectionResult["connectionStatus"],
  ): WhatsappInstanceStatusDto {
    if (status === "connected") {
      return "active";
    }

    if (status === "disconnected" || status === "error") {
      return status;
    }

    // "not_configured", "pending" and "qr_required" have no dedicated DTO
    // status yet; "disconnected" is the closest fit until then.
    return "disconnected";
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token, "utf8").digest("hex");
  }

  private buildWebhookUrl(
    apiPublicUrl: string,
    instanceId: string,
    secret: string,
  ): string {
    const url = new URL(
      `/webhooks/uazapi/instances/${encodeURIComponent(instanceId)}`,
      apiPublicUrl,
    );
    url.searchParams.set("token", secret);

    return url.toString();
  }

  private requireEnabledConfig() {
    const config = parseInboundWebhooksConfig(this.env);

    if (!config.enabled) {
      throw new ServiceUnavailableException(
        "Recursos de webhook de entrada ainda nao estao habilitados",
      );
    }

    return config;
  }

  private toDto(instance: PersistedWhatsappInstance): WhatsappInstanceDto {
    return {
      id: instance.id,
      name: instance.name,
      status: this.statusToDto(instance.status),
      providerInstanceId: instance.providerInstanceId,
      createdAt: instance.createdAt.toISOString(),
    };
  }

  private statusToDto(status: string): WhatsappInstanceStatusDto {
    if (status === "active") {
      return "active";
    }

    if (status === "error") {
      return "error";
    }

    return "disconnected";
  }

  private auditSummary(
    instance: PersistedWhatsappInstance,
  ): Prisma.InputJsonObject {
    return {
      status: instance.status,
      providerInstanceId: instance.providerInstanceId,
    };
  }

  private async createAudit(
    transaction: Prisma.TransactionClient,
    input: {
      workspaceId: string;
      actorUserId: string;
      action: string;
      targetId: string;
      resultStatus: string;
      beforeSummary: Prisma.InputJsonObject | undefined;
      afterSummary: Prisma.InputJsonObject;
    },
  ): Promise<void> {
    await transaction.auditLog.create({
      data: {
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: input.action,
        targetType: "WhatsappInstance",
        targetId: input.targetId,
        reason: null,
        sourceIp: null,
        resultStatus: input.resultStatus,
        beforeSummary: input.beforeSummary,
        afterSummary: input.afterSummary,
      },
    });
  }
}
