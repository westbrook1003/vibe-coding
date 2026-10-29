import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../entities/user.entity';

export const ROLES_KEY = 'roles';

/** 限制访问角色，由 RolesGuard 校验 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
