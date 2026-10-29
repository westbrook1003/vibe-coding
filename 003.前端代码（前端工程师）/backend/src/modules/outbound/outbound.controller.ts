import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OutboundService } from './outbound.service';
import { CreateOutboundDto, OutboundQueryDto } from './outbound.dto';
import { CurrentUser, CurrentUserDecorator } from '../../common/decorators/current-user.decorator';

@ApiTags('物资出库')
@ApiBearerAuth()
@Controller('outbounds')
export class OutboundController {
  constructor(private readonly outboundService: OutboundService) {}

  @Post()
  @ApiOperation({ summary: '新增出库记录', description: '出库数量不得超过当前结存' })
  create(@Body() dto: CreateOutboundDto, @CurrentUserDecorator() user: CurrentUser) {
    return this.outboundService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: '出库记录列表' })
  findAll(@Query() query: OutboundQueryDto) {
    return this.outboundService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '出库记录详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.outboundService.findById(id);
  }
}
