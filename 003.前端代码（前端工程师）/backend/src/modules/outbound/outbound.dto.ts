import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, Max, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class OutboundQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '拼音码 / 品名 / 出库对象' })
  @IsOptional()
  @MaxLength(64)
  keyword?: string;

  @ApiPropertyOptional({ description: '出库对象 id' })
  @IsOptional()
  @IsNumber()
  receiverId?: number;

  @ApiPropertyOptional({ description: '操作人 id' })
  @IsOptional()
  @IsNumber()
  operatorId?: number;

  @ApiPropertyOptional({ description: '开始日期 YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: '结束日期 YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class CreateOutboundDto {
  @ApiProperty({ description: '拼音码', example: 'wsm' })
  @IsNotEmpty({ message: '请输入拼音码' })
  @MaxLength(64)
  pinyin: string;

  @ApiProperty({ example: 1, description: '数量，> 0，且不得超过当前结存' })
  @IsNumber({}, { message: '请填写正确的数量' })
  @Min(0.001, { message: '数量必须大于 0' })
  @Max(9999999, { message: '数量超出范围' })
  qty: number;

  @ApiProperty({
    description: '出库到（个人）：可从列表选择，也可直接输入新名字，提交后自动加入列表',
    example: '张三',
  })
  @IsNotEmpty({ message: '请填写出库对象' })
  @MaxLength(64)
  receiverName: string;

  @ApiPropertyOptional({ example: '项目现场使用' })
  @IsOptional()
  @MaxLength(256)
  remark?: string;
}
