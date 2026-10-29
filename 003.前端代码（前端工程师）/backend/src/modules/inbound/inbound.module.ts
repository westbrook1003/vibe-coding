import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InboundEntity } from '../../entities/inbound.entity';
import { ItemEntity } from '../../entities/item.entity';
import { ItemModule } from '../item/item.module';
import { InboundController } from './inbound.controller';
import { InboundService } from './inbound.service';

@Module({
  imports: [TypeOrmModule.forFeature([InboundEntity, ItemEntity]), ItemModule],
  controllers: [InboundController],
  providers: [InboundService],
})
export class InboundModule {}
