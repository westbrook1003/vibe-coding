import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** 用户名：3~20 位字母、数字、下划线 */
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
/** 密码：6~20 位，至少包含字母和数字 */
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[\S]{6,20}$/;

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsNotEmpty({ message: '请输入用户名' })
  @MaxLength(32)
  username: string;

  @ApiProperty({ example: 'admin' })
  @IsNotEmpty({ message: '请输入密码' })
  @MaxLength(64)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'zhangsan', pattern: '^[A-Za-z0-9_]{3,20}$' })
  @Matches(USERNAME_PATTERN, { message: '用户名需为 3~20 位字母、数字或下划线' })
  username: string;

  @ApiProperty({ example: 'wz123456', pattern: '^(?=.*[A-Za-z])(?=.*\\d)[\\S]{6,20}$' })
  @Matches(PASSWORD_PATTERN, { message: '密码需 6~20 位，且至少包含字母和数字' })
  password: string;

  @ApiProperty({ example: '张三' })
  @IsNotEmpty({ message: '请填写姓名' })
  @MaxLength(32)
  realName: string;

  @ApiPropertyOptional({ example: 'zhangsan@example.com' })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(128)
  email?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: '用户名或注册邮箱' })
  @IsNotEmpty({ message: '请输入用户名或邮箱' })
  usernameOrEmail: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: '用户名或注册邮箱' })
  @IsNotEmpty({ message: '请输入用户名或邮箱' })
  usernameOrEmail: string;

  @ApiProperty({ description: '6 位数字验证码', example: '123456' })
  @Matches(/^\d{6}$/, { message: '请输入 6 位数字验证码' })
  code: string;

  @ApiProperty({ example: 'wz123456', pattern: '^(?=.*[A-Za-z])(?=.*\\d)[\\S]{6,20}$' })
  @Matches(PASSWORD_PATTERN, { message: '密码需 6~20 位，且至少包含字母和数字' })
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'admin' })
  @IsNotEmpty({ message: '请输入当前密码' })
  currentPassword: string;

  @ApiProperty({ example: 'wz123456', pattern: '^(?=.*[A-Za-z])(?=.*\\d)[\\S]{6,20}$' })
  @Matches(PASSWORD_PATTERN, { message: '密码需 6~20 位，且至少包含字母和数字' })
  newPassword: string;
}
