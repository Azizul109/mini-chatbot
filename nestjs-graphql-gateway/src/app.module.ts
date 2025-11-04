// src/app.module.ts
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';

// Import modules
import { PrismaModule } from './prisma/prisma.module';
import { ChatModule } from './chat/chat.module';
import { BotModule } from './bot/bot.module';
import { WorkspaceModule } from './workspace/workspace.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      playground: true,
      subscriptions: {
        'graphql-ws': true,
      },
    }),
    PrismaModule,
    WorkspaceModule,
    BotModule,
    ChatModule,
  ],
})
export class AppModule {}