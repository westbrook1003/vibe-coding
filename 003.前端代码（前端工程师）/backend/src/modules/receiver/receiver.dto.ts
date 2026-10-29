import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { ReceiverStatus } from '../../entities/receiver.entity';

export class ReceiverQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '名称 / 备注' })
  @IsOptional()
  @MaxLength(64)
  keyword?: string;

  @ApiPropertyOptional({ enum: ReceiverStatus })
  @IsOptional()
  @IsEnum(ReceiverStatus)
  status?: ReceiverStatus;
}

export class CreateReceiverDto {
  @ApiProperty({ example: '项目A施工组' })
  @IsNotEmpty({ message: '请填写名称' })
  @MaxLength(64)
  name: string;

  @ApiPropertyOptional({ example: '所属项目 / 部门 / 班组' })
  @IsOptional()
  @MaxLength(128)
  remark?: string;
}

export class UpdateReceiverDto {
  @ApiPropertyOptional({ example: '项目A施工组' })
  @IsOptional()
  @IsNotEmpty({ message: '名称不能为空' })
  @MaxLength(64)
  name?: string;

  @ApiPropertyOptional({ example: '所属项目 / 部门 / 班组' })
  @IsOptional()
  @MaxLength(128)
  remark?: string;

  @ApiPropertyOptional({ enum: ReceiverStatus })
  @IsOptional()
  @IsEnum(ReceiverStatus)
  status?: ReceiverStatus;
}
