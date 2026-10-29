import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, Max, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class InboundQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '拼音码 / 品名 / 订单编号' })
  @IsOptional()
  @MaxLength(64)
  keyword?: string;

  @ApiPropertyOptional({ description: '开始日期 YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: '结束日期 YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: '操作人 id' })
  @IsOptional()
  @IsNumber()
  operatorId?: number;
}

export class CreateInboundDto {
  @ApiProperty({ description: '拼音码（与 itemId 二选一）', example: 'wsm' })
  @IsNotEmpty({ message: '请输入拼音码' })
  @MaxLength(64)
  pinyin: string;

  @ApiProperty({ example: 2, description: '数量，> 0，最多 3 位小数' })
  @IsNumber({}, { message: '请填写正确的数量' })
  @Min(0.001, { message: '数量必须大于 0' })
  @Max(9999999, { message: '数量超出范围' })
  qty: number;

  @ApiProperty({ description: '订单编号', example: '20261026T12345' })
  @IsNotEmpty({ message: '请填写订单编号' })
  @MaxLength(64)
  orderNo: string;

  @ApiPropertyOptional({ example: '京东满减' })
  @IsOptional()
  @MaxLength(256)
  remark?: string;
}
