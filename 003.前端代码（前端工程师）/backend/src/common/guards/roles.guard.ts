import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserRole } from '../../entities/user.entity';

/**
 * 角色守卫：校验 `@Roles(UserRole.ADMIN)` 标注的接口。
 * 人员信息维护模块仅管理员可访问（PRD F5）。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as CurrentUser;
    if (!user || !required.includes(user.role as UserRole)) {
      throw new ForbiddenException({ code: 40301, message: '无权限访问该功能' });
    }
    return true;
  }
}
