import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReceiverService } from './receiver.service';
import { CreateReceiverDto, ReceiverQueryDto, UpdateReceiverDto } from './receiver.dto';

@ApiTags('出库对象')
@ApiBearerAuth()
@Controller('receivers')
export class ReceiverController {
  constructor(private readonly receiverService: ReceiverService) {}

  @Get()
  @ApiOperation({ summary: '出库对象列表' })
  findAll(@Query() query: ReceiverQueryDto) {
    return this.receiverService.findAll(query);
  }

  @Get('active')
  @ApiOperation({ summary: '全部启用对象（供出库页下拉选择）' })
  listActive() {
    return this.receiverService.listActive();
  }

  @Get(':id')
  @ApiOperation({ summary: '出库对象详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.receiverService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: '新增出库对象' })
  create(@Body() dto: CreateReceiverDto) {
    return this.receiverService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '编辑出库对象' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReceiverDto) {
    return this.receiverService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除出库对象', description: '已有出库记录时不可删除，仅可停用' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.receiverService.remove(id);
  }
}
