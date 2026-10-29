import { ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { BusinessException, BizCode } from '../exceptions/business.exception';

/**
 * 全局 JWT 守卫：默认所有接口都需要登录，
 * 标记了 `@Public()` 的接口放行。
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  /**
   * 统一未登录 / token 失效的错误响应。
   * Passport 默认抛的是 `UnauthorizedException('Unauthorized')`，
   * 业务码会退化成 40001，与接口契约（40101）不一致，这里改写掉。
   */
  handleRequest<TUser = unknown>(err: unknown, user: TUser, info: unknown): TUser {
    if (err || !user) {
      throw new BusinessException(
        '登录已失效，请重新登录',
        BizCode.UNAUTHORIZED,
        HttpStatus.UNAUTHORIZED,
      );
    }
    return user;
  }
}
