import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { StockQueryDto } from './stock.dto';

@ApiTags('库存')
@ApiBearerAuth()
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @ApiOperation({ summary: '库存清单', description: '结存 = 累计入库 − 累计出库' })
  findAll(@Query() query: StockQueryDto) {
    return this.stockService.findAll(query);
  }

  @Get('summary')
  @ApiOperation({ summary: '首页指标：物品种类数 / 库存总值 / 本月出入库金额' })
  summary() {
    return this.stockService.summary();
  }
}
