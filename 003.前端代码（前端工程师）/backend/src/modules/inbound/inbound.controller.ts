import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InboundService } from './inbound.service';
import { CreateInboundDto, InboundQueryDto } from './inbound.dto';
import { CurrentUser, CurrentUserDecorator } from '../../common/decorators/current-user.decorator';

@ApiTags('物资入库')
@ApiBearerAuth()
@Controller('inbounds')
export class InboundController {
  constructor(private readonly inboundService: InboundService) {}

  @Post()
  @ApiOperation({ summary: '新增入库记录', description: '记录不可编辑、不可删除' })
  create(@Body() dto: CreateInboundDto, @CurrentUserDecorator() user: CurrentUser) {
    return this.inboundService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: '入库记录列表' })
  findAll(@Query() query: InboundQueryDto) {
    return this.inboundService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '入库记录详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.inboundService.findById(id);
  }
}
