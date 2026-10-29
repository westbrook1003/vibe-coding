import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { UserEntity, UserRole, UserStatus } from '../../entities/user.entity';
import { InboundEntity } from '../../entities/inbound.entity';
import { OutboundEntity } from '../../entities/outbound.entity';
import { BusinessException, BizCode } from '../../common/exceptions/business.exception';
import { PageResult, PaginationQueryDto } from '../../common/dto/pagination.dto';
import {
  CreateUserDto,
  ResetUserPasswordDto,
  UpdateUserDto,
  UpdateUserStatusDto,
  UserQueryDto,
} from './user.dto';

/** 人员信息维护 —— 仅 admin 可访问（PRD F5） */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(InboundEntity) private readonly inbounds: Repository<InboundEntity>,
    @InjectRepository(OutboundEntity) private readonly outbounds: Repository<OutboundEntity>,
  ) {}

  async findAll(query: UserQueryDto): Promise<PageResult<UserEntity>> {
    const qb = this.users.createQueryBuilder('u');

    if (query.keyword) {
      qb.andWhere('(u.username LIKE :kw OR u.realName LIKE :kw OR u.email LIKE :kw)', {
        kw: `%${query.keyword}%`,
      });
    }
    if (query.role) qb.andWhere('u.role = :role', { role: query.role });
    if (query.status) qb.andWhere('u.status = :status', { status: query.status });

    const sortBy = query.sortBy ?? 'createdAt';
    qb.orderBy(`u.${sortBy}`, query.sortOrder)
      .skip(query.skip)
      .take(query.pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: query.page, pageSize: query.pageSize };
  }

  async findById(id: number): Promise<UserEntity> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new BusinessException('人员不存在', BizCode.NOT_FOUND, 404);
    return user;
  }

  async create(dto: CreateUserDto): Promise<UserEntity> {
    const exists = await this.users.findOne({ where: { username: dto.username } });
    if (exists) throw new BusinessException('该用户名已被注册', BizCode.CONFLICT, 409);

    if (dto.email) {
      const emailTaken = await this.users.findOne({ where: { email: dto.email } });
      if (emailTaken) throw new BusinessException('该邮箱已被其他账号绑定', BizCode.CONFLICT, 409);
    }

    const user = this.users.create({
      username: dto.username,
      password: await bcrypt.hash(dto.initialPassword, 10),
      realName: dto.realName,
      email: dto.email ?? null,
      role: dto.role ?? UserRole.USER,
      status: dto.status ?? UserStatus.ACTIVE,
      // 管理员新建的账号，首次登录需修改密码（PRD F5.2）
      mustChangePassword: true,
    });
    return this.users.save(user);
  }

  async update(id: number, dto: UpdateUserDto, operatorId: number): Promise<UserEntity> {
    const user = await this.findById(id);

    // R5.1：admin 不能降级/停用自己
    if (user.id === operatorId) {
      if (dto.role && dto.role !== UserRole.ADMIN) {
        throw new BusinessException('不能修改自己的角色', BizCode.BUSINESS_RULE);
      }
      if (dto.status && dto.status !== UserStatus.ACTIVE) {
        throw new BusinessException('不能停用自己的账号', BizCode.BUSINESS_RULE);
      }
    }

    // R5.2：系统内至少保留 1 个启用状态的 admin
    if (user.role === UserRole.ADMIN && user.status === UserStatus.ACTIVE) {
      const losingAdmin =
        (dto.role && dto.role !== UserRole.ADMIN) ||
        (dto.status && dto.status !== UserStatus.ACTIVE);
      if (losingAdmin) await this.assertNotLastAdmin();
    }

    if (dto.email) {
      const emailTaken = await this.users.findOne({
        where: { email: dto.email },
      });
      if (emailTaken && emailTaken.id !== id) {
        throw new BusinessException('该邮箱已被其他账号绑定', BizCode.CONFLICT, 409);
      }
    }

    Object.assign(user, {
      realName: dto.realName ?? user.realName,
      email: dto.email === undefined ? user.email : dto.email,
      role: dto.role ?? user.role,
      status: dto.status ?? user.status,
    });
    return this.users.save(user);
  }

  async updateStatus(
    id: number,
    dto: UpdateUserStatusDto,
    operatorId: number,
  ): Promise<UserEntity> {
    if (id === operatorId && dto.status === UserStatus.DISABLED) {
      throw new BusinessException('不能停用自己的账号', BizCode.BUSINESS_RULE);
    }
    const user = await this.findById(id);
    if (user.role === UserRole.ADMIN && user.status === UserStatus.ACTIVE) {
      if (dto.status === UserStatus.DISABLED) await this.assertNotLastAdmin();
    }
    user.status = dto.status;
    return this.users.save(user);
  }

  async resetPassword(id: number, dto: ResetUserPasswordDto): Promise<void> {
    const user = await this.findById(id);
    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.loginFailCount = 0;
    user.lockedUntil = null;
    user.mustChangePassword = true;
    await this.users.save(user);
  }

  async remove(id: number, operatorId: number): Promise<void> {
    if (id === operatorId) {
      throw new BusinessException('不能删除自己的账号', BizCode.BUSINESS_RULE);
    }
    const user = await this.findById(id);

    const inboundCount = await this.inbounds.count({ where: { userId: id } });
    const outboundCount = await this.outbounds.count({ where: { userId: id } });
    if (inboundCount > 0 || outboundCount > 0) {
      throw new BusinessException('该用户有操作记录，请改为停用', BizCode.BUSINESS_RULE);
    }
    if (user.role === UserRole.ADMIN) await this.assertNotLastAdmin();

    await this.users.remove(user);
  }

  /** 统计当前启用状态的 admin 数量，校验至少保留 1 个 */
  private async assertNotLastAdmin(): Promise<void> {
    const count = await this.users.count({
      where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    });
    if (count <= 1) {
      throw new BusinessException('系统内必须保留至少一个启用状态的管理员', BizCode.BUSINESS_RULE);
    }
  }
}
