import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
} from "@nestjs/common";
import { whatsappInstanceCreateInputSchema } from "@wpptrack/shared";
import { AuthToken } from "../auth/auth-user.decorator";
import { AuthService } from "../auth/auth.service";
import { WorkspacesService } from "../workspaces/workspaces.service";
import { WhatsappInstancesService } from "./whatsapp-instances.service";

@Controller("integrations/whatsapp-instances")
export class WhatsappInstancesController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(WorkspacesService)
    private readonly workspacesService: WorkspacesService,
    @Inject(WhatsappInstancesService)
    private readonly whatsappInstancesService: WhatsappInstancesService,
  ) {}

  @Get()
  async list(@AuthToken() refreshToken: string) {
    const { workspaceId } =
      await this.getCurrentWorkspaceContext(refreshToken);

    return this.whatsappInstancesService.list(workspaceId);
  }

  @Post()
  async create(@AuthToken() refreshToken: string, @Body() body: unknown) {
    const context = await this.requireManager(refreshToken);
    const parsed = whatsappInstanceCreateInputSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.whatsappInstancesService.create(
      context.workspaceId,
      parsed.data.name,
      parsed.data.instanceToken,
      context.userId,
    );
  }

  @Post(":instanceId/refresh")
  @HttpCode(200)
  async refresh(
    @AuthToken() refreshToken: string,
    @Param("instanceId") instanceId: string,
  ) {
    const context = await this.requireManager(refreshToken);

    return this.whatsappInstancesService.refresh(
      context.workspaceId,
      instanceId,
    );
  }

  @Delete(":instanceId")
  @HttpCode(204)
  async remove(
    @AuthToken() refreshToken: string,
    @Param("instanceId") instanceId: string,
  ): Promise<void> {
    const context = await this.requireManager(refreshToken);

    await this.whatsappInstancesService.remove(
      context.workspaceId,
      instanceId,
    );
  }

  private async requireManager(refreshToken: string): Promise<{
    userId: string;
    workspaceId: string;
  }> {
    const context = await this.getCurrentWorkspaceContext(refreshToken);

    if (!context.canManageIntegrations) {
      throw new ForbiddenException("Sem permissao para gerenciar integracoes");
    }

    return {
      userId: context.userId,
      workspaceId: context.workspaceId,
    };
  }

  private async getCurrentWorkspaceContext(refreshToken: string): Promise<{
    canManageIntegrations: boolean;
    userId: string;
    workspaceId: string;
  }> {
    const authenticated = await this.authService.getSession(refreshToken);
    const workspace = this.workspacesService.getCurrentWorkspace(authenticated);

    return {
      canManageIntegrations: workspace.permissions.canManageIntegrations,
      userId: authenticated.user.id,
      workspaceId: workspace.id,
    };
  }
}
