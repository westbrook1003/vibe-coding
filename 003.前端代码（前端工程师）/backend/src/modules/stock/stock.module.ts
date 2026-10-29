import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemEntity } from '../../entities/item.entity';
import { InboundEntity } from '../../entities/inbound.entity';
import { OutboundEntity } from '../../entities/outbound.entity';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  imports: [TypeOrmModule.forFeature([ItemEntity, InboundEntity, OutboundEntity])],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
