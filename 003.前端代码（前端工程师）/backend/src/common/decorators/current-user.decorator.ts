import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** 当前登录用户的资料，由 JWT 策略解析后挂在 request.user 上 */
export interface CurrentUser {
  id: number;
  username: string;
  realName: string;
  email: string | null;
  role: string;
  mustChangePassword: boolean;
}

/** 取当前登录用户 */
export const CurrentUserDecorator = createParamDecorator(
  (data: keyof CurrentUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: CurrentUser = request.user;
    return data ? user?.[data] : user;
  },
);
