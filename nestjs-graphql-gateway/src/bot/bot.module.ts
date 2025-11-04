import { Module } from '@nestjs/common';
import { BotResolver } from './bot.resolver';
import { BotService } from './bot.service';
import { PrismaModule } from '../prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [PrismaModule, HttpModule],
  providers: [BotResolver, BotService],
  exports: [BotService],
})
export class BotModule {}