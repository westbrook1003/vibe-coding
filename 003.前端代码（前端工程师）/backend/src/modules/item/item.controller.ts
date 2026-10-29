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
import { ItemService } from './item.service';
import {
  CreateItemDto,
  ItemQueryDto,
  PinyinQueryDto,
  UpdateItemDto,
  UpdateItemStatusDto,
} from './item.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@ApiTags('物资档案')
@ApiBearerAuth()
@Controller('items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Get()
  @ApiOperation({ summary: '物资列表' })
  findAll(@Query() query: ItemQueryDto) {
    return this.itemService.findAll(query);
  }

  @Get('platforms')
  @ApiOperation({ summary: '全部购买平台（用于筛选下拉）' })
  listPlatforms() {
    return this.itemService.listPlatforms();
  }

  @Get('search')
  @ApiOperation({
    summary: '拼音码联想检索',
    description: '输入即模糊匹配，前缀命中优先；只返回启用状态的物资',
  })
  search(@Query() query: PinyinQueryDto) {
    return this.itemService.searchByPinyin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '物资详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.itemService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: '新增物资' })
  create(@Body() dto: CreateItemDto) {
    return this.itemService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '编辑物资' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateItemDto) {
    return this.itemService.update(id, dto);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '启用 / 停用物资' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateItemStatusDto,
  ) {
    return this.itemService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除物资', description: '仅 admin，且该物资从未产生过出入库记录' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.itemService.remove(id);
  }
}
