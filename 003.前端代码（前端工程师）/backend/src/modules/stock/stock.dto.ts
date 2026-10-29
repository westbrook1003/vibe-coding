import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class StockQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '拼音码 / 品名' })
  @IsOptional()
  @MaxLength(64)
  keyword?: string;

  @ApiPropertyOptional({ description: '购买平台' })
  @IsOptional()
  @MaxLength(32)
  platform?: string;

  @ApiPropertyOptional({ description: '只看有结存的物资' })
  @IsOptional()
  @IsBoolean()
  onlyInStock?: boolean;

  @ApiPropertyOptional({ description: '只看结存为 0 的物资' })
  @IsOptional()
  @IsBoolean()
  onlyZero?: boolean;
}
