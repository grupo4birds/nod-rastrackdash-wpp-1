import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../common/prisma/prisma.module";
import { WorkspacesController } from "./workspaces.controller";
import { WorkspacesService } from "./workspaces.service";
import { WorkspaceContextService } from "./workspace-context.service";
import { WorkspaceAccessPolicyService } from "./workspace-access-policy.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [WorkspacesController],
  providers: [
    WorkspacesService,
    WorkspaceAccessPolicyService,
    WorkspaceContextService
  ],
  exports: [
    WorkspacesService,
    WorkspaceAccessPolicyService,
    WorkspaceContextService
  ]
})
export class WorkspacesModule {}
