// src/workspace/workspace.resolver.ts
import { Resolver, Query, Args } from '@nestjs/graphql';
import { WorkspaceService } from './workspace.service';
import { Workspace } from '../graphql.types';

@Resolver(() => Workspace)
export class WorkspaceResolver {
  constructor(private workspaceService: WorkspaceService) {}

  @Query(() => Workspace, { nullable: true, name: 'workspace' })
  async getWorkspace(@Args('id') id: string) {
    return this.workspaceService.findById(id);
  }
}