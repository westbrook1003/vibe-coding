import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiverEntity } from '../../entities/receiver.entity';
import { OutboundEntity } from '../../entities/outbound.entity';
import { ReceiverController } from './receiver.controller';
import { ReceiverService } from './receiver.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReceiverEntity, OutboundEntity])],
  controllers: [ReceiverController],
  providers: [ReceiverService],
  exports: [ReceiverService],
})
export class ReceiverModule {}
