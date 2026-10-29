import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { UserRole, UserStatus } from '../../entities/user.entity';
import { PASSWORD_PATTERN, USERNAME_PATTERN } from '../auth/auth.dto';

export class UserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '用户名 / 姓名 / 邮箱' })
  @IsOptional()
  @MaxLength(64)
  keyword?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class CreateUserDto {
  @ApiProperty({ example: 'lisi', pattern: '^[A-Za-z0-9_]{3,20}$' })
  @Matches(USERNAME_PATTERN, { message: '用户名需为 3~20 位字母、数字或下划线' })
  username: string;

  @ApiProperty({
    example: 'wz123456',
    description: '初始密码，创建后由管理员转告本人',
    pattern: '^(?=.*[A-Za-z])(?=.*\\d)[\\S]{6,20}$',
  })
  @Matches(PASSWORD_PATTERN, { message: '密码需 6~20 位，且至少包含字母和数字' })
  initialPassword: string;

  @ApiProperty({ example: '李四' })
  @IsNotEmpty({ message: '请填写姓名' })
  @MaxLength(32)
  realName: string;

  @ApiPropertyOptional({ example: 'lisi@example.com' })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(128)
  email?: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.USER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: '李四' })
  @IsOptional()
  @IsNotEmpty({ message: '姓名不能为空' })
  @MaxLength(32)
  realName?: string;

  @ApiPropertyOptional({ example: 'lisi@example.com' })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(128)
  email?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class ResetUserPasswordDto {
  @ApiProperty({ example: 'wz123456', pattern: '^(?=.*[A-Za-z])(?=.*\\d)[\\S]{6,20}$' })
  @Matches(PASSWORD_PATTERN, { message: '密码需 6~20 位，且至少包含字母和数字' })
  newPassword: string;
}

export class UpdateUserStatusDto {
  @ApiProperty({ enum: UserStatus })
  @IsEnum(UserStatus)
  status: UserStatus;
}
