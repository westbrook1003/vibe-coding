import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 标记为公开接口，JWT 守卫会放行。
 * 用于登录、注册、找回密码等无需登录即可访问的端点。
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
