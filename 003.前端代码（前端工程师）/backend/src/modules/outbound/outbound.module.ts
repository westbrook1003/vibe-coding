import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboundEntity } from '../../entities/outbound.entity';
import { ItemEntity } from '../../entities/item.entity';
import { ReceiverEntity } from '../../entities/receiver.entity';
import { ItemModule } from '../item/item.module';
import { OutboundController } from './outbound.controller';
import { OutboundService } from './outbound.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OutboundEntity, ItemEntity, ReceiverEntity]),
    ItemModule,
  ],
  controllers: [OutboundController],
  providers: [OutboundService],
})
export class OutboundModule {}
