// src/workspace/workspace.module.ts
import { Module } from '@nestjs/common';
import { WorkspaceResolver } from './workspace.resolver';
import { WorkspaceService } from './workspace.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [WorkspaceResolver, WorkspaceService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}