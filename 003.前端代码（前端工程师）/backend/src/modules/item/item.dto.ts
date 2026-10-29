import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { ItemStatus } from '../../entities/item.entity';
import { PINYIN_PATTERN } from '../../common/utils/pinyin.util';

export class ItemQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '拼音码 / 品名' })
  @IsOptional()
  @MaxLength(64)
  keyword?: string;

  @ApiPropertyOptional({ description: '购买平台' })
  @IsOptional()
  @MaxLength(32)
  platform?: string;

  @ApiPropertyOptional({ enum: ItemStatus })
  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus;
}

/** 拼音码联想检索 */
export class PinyinQueryDto {
  @ApiProperty({ description: '拼音码或品名关键词', example: 'ws' })
  @IsNotEmpty({ message: '请输入检索内容' })
  @MaxLength(64)
  q: string;

  @ApiPropertyOptional({ description: '返回条数上限', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ description: '是否只返回有结存的物资' })
  @IsOptional()
  onlyInStock?: boolean;
}

export class CreateItemDto {
  @ApiProperty({ example: '无线鼠标' })
  @IsNotEmpty({ message: '请填写品名' })
  @MaxLength(64)
  name: string;

  @ApiProperty({ example: '个' })
  @IsNotEmpty({ message: '请选择单位' })
  @MaxLength(16)
  unit: string;

  @ApiProperty({ example: 29.9 })
  @IsNumber({}, { message: '请填写正确的零售价' })
  @Min(0, { message: '零售价不能为负数' })
  @Max(99999999, { message: '零售价超出范围' })
  price: number;

  @ApiProperty({ example: '淘宝' })
  @IsNotEmpty({ message: '请选择购买平台' })
  @MaxLength(32)
  platform: string;

  @ApiProperty({ example: 'wsm', description: '品名拼音码，多个码用逗号分隔' })
  @Matches(PINYIN_PATTERN, { message: '拼音码只能包含小写字母、数字，多个码用逗号分隔' })
  @MaxLength(128)
  pinyin: string;

  @ApiPropertyOptional({ example: '办公耗材' })
  @IsOptional()
  @MaxLength(256)
  remark?: string;
}

export class UpdateItemDto {
  @ApiPropertyOptional({ example: '无线鼠标' })
  @IsOptional()
  @IsNotEmpty({ message: '品名不能为空' })
  @MaxLength(64)
  name?: string;

  @ApiPropertyOptional({ example: '个' })
  @IsOptional()
  @IsNotEmpty({ message: '单位不能为空' })
  @MaxLength(16)
  unit?: string;

  @ApiPropertyOptional({ example: 29.9 })
  @IsOptional()
  @IsNumber({}, { message: '请填写正确的零售价' })
  @Min(0, { message: '零售价不能为负数' })
  price?: number;

  @ApiPropertyOptional({ example: '淘宝' })
  @IsOptional()
  @IsNotEmpty({ message: '购买平台不能为空' })
  @MaxLength(32)
  platform?: string;

  @ApiPropertyOptional({ example: 'wsm,sb' })
  @IsOptional()
  @Matches(PINYIN_PATTERN, { message: '拼音码只能包含小写字母、数字，多个码用逗号分隔' })
  @MaxLength(128)
  pinyin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @MaxLength(256)
  remark?: string;
}

export class UpdateItemStatusDto {
  @ApiProperty({ enum: ItemStatus })
  @IsEnum(ItemStatus)
  status: ItemStatus;
}
