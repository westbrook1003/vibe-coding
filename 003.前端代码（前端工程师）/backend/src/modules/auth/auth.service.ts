import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { UserEntity, UserRole, UserStatus } from '../../entities/user.entity';
import { BusinessException, BizCode } from '../../common/exceptions/business.exception';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

export interface JwtPayload {
  sub: number;
  username: string;
  role: UserRole;
}

export interface AuthResult {
  token: string;
  user: CurrentUser;
}

/** 找回密码验证码的临时存储 */
interface ResetCodeEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

/**
 * 认证服务：登录、注册、找回密码、改密。
 *
 * 说明：验证码保存在进程内存中，服务重启即失效 —— 这是刻意的取舍，
 * 目的是保持数据库结构与 PRD §5.1 的 5 张表完全一致。
 * 若需多实例部署，把 `resetCodes` 换成 Redis 即可，接口不变。
 */
@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private readonly resetCodes = new Map<string, ResetCodeEntry>();
  private readonly resetSentAt = new Map<string, number[]>();

  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** 启动时确保内置管理员存在（PRD F1.1） */
  async onModuleInit(): Promise<void> {
    const username = this.config.get<string>('auth.adminUsername');
    const password = this.config.get<string>('auth.adminPassword');
    const exists = await this.users.findOne({ where: { username } });
    if (exists) return;

    await this.users.save(
      this.users.create({
        username,
        password: await bcrypt.hash(password, 10),
        realName: '系统管理员',
        email: null,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        mustChangePassword: true,
      }),
    );
    this.logger.log(`已创建内置管理员账号：${username}（首次登录后请立即修改密码）`);
  }

  /* ---------------- 登录 ---------------- */

  async login(username: string, password: string): Promise<AuthResult> {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.username = :username', { username })
      .getOne();

    const maxAttempts = this.config.get<number>('auth.loginMaxAttempts');
    const lockMinutes = this.config.get<number>('auth.loginLockMinutes');

    if (!user) {
      // 不暴露"账号不存在"，与密码错误返回同一提示
      throw new BusinessException('用户名或密码错误', BizCode.BAD_CREDENTIALS, 401);
    }

    if (user.status === UserStatus.DISABLED) {
      throw new BusinessException('该账号已停用，请联系管理员', BizCode.FORBIDDEN, 403);
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new BusinessException(
        `密码错误次数过多，账号已锁定，请 ${minutes} 分钟后再试`,
        BizCode.LOCKED,
        429,
      );
    }

    const matched = await bcrypt.compare(password, user.password);
    if (!matched) {
      const failCount = user.loginFailCount + 1;
      const shouldLock = failCount >= maxAttempts;
      await this.users.update(user.id, {
        loginFailCount: shouldLock ? 0 : failCount,
        lockedUntil: shouldLock ? new Date(Date.now() + lockMinutes * 60_000) : null,
      });
      if (shouldLock) {
        throw new BusinessException(
          `密码错误次数过多，账号已锁定 ${lockMinutes} 分钟`,
          BizCode.LOCKED,
          429,
        );
      }
      throw new BusinessException('用户名或密码错误', BizCode.BAD_CREDENTIALS, 401);
    }

    await this.users.update(user.id, {
      loginFailCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    });

    return this.issueToken(user);
  }

  /* ---------------- 注册 ---------------- */

  async register(dto: {
    username: string;
    password: string;
    realName: string;
    email?: string;
  }): Promise<AuthResult> {
    const exists = await this.users.findOne({ where: { username: dto.username } });
    if (exists) {
      throw new BusinessException('该用户名已被注册', BizCode.CONFLICT, 409);
    }
    if (dto.email) {
      const emailTaken = await this.users.findOne({ where: { email: dto.email } });
      if (emailTaken) {
        throw new BusinessException('该邮箱已被其他账号绑定', BizCode.CONFLICT, 409);
      }
    }

    const user = await this.users.save(
      this.users.create({
        username: dto.username,
        password: await bcrypt.hash(dto.password, 10),
        realName: dto.realName,
        email: dto.email ?? null,
        role: UserRole.USER, // 注册用户一律为普通用户（PRD F1.3）
        status: UserStatus.ACTIVE,
        mustChangePassword: false,
      }),
    );

    return this.issueToken(user);
  }

  /* ---------------- 找回密码 ---------------- */

  /**
   * 发起找回密码。
   * - 已绑定邮箱 → 返回 channel=email，验证码发邮件（此处只生成，不实际发送）。
   * - 未绑定邮箱 → 返回 channel=admin，提示联系管理员重置（PRD F1.4 路径 B）。
   */
  async requestPasswordReset(usernameOrEmail: string): Promise<{
    channel: 'email' | 'admin';
    message: string;
  }> {
    const user = await this.users.findOne({
      where: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    if (!user) {
      // 同样不暴露账号是否存在
      throw new BusinessException('用户名或密码错误', BizCode.BAD_CREDENTIALS, 401);
    }
    if (user.status === UserStatus.DISABLED) {
      throw new BusinessException('该账号已停用，请联系管理员', BizCode.FORBIDDEN, 403);
    }
    if (!user.email) {
      return {
        channel: 'admin',
        message: '该账号未绑定邮箱，请联系管理员重置密码',
      };
    }

    const now = Date.now();
    const sentList = (this.resetSentAt.get(user.username) ?? []).filter((t) => now - t < 3600_000);
    const maxPerHour = this.config.get<number>('auth.resetCodeMaxPerHour');
    if (sentList.length >= maxPerHour) {
      throw new BusinessException('验证码发送过于频繁，请 1 小时后再试', BizCode.BUSINESS_RULE, 429);
    }
    sentList.push(now);
    this.resetSentAt.set(user.username, sentList);

    const ttl = this.config.get<number>('auth.resetCodeTtlMinutes');
    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.resetCodes.set(user.username, {
      code,
      expiresAt: now + ttl * 60_000,
      attempts: 0,
    });

    this.logger.log(`[重置密码] 用户 ${user.username} 的验证码已生成：${code}（真实环境请发送邮件）`);
    return { channel: 'email', message: '验证码已发送至该账号绑定的邮箱' };
  }

  /** 校验验证码并重置密码 */
  async resetPassword(usernameOrEmail: string, code: string, newPassword: string): Promise<void> {
    const user = await this.users.findOne({
      where: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });
    if (!user) {
      throw new BusinessException('用户名或密码错误', BizCode.BAD_CREDENTIALS, 401);
    }

    const entry = this.resetCodes.get(user.username);
    if (!entry || entry.expiresAt < Date.now()) {
      this.resetCodes.delete(user.username);
      throw new BusinessException('验证码错误或已过期', BizCode.BUSINESS_RULE);
    }
    if (entry.attempts >= 5) {
      this.resetCodes.delete(user.username);
      throw new BusinessException('验证码错误次数过多，请重新获取', BizCode.BUSINESS_RULE);
    }
    if (entry.code !== code) {
      entry.attempts += 1;
      throw new BusinessException('验证码错误或已过期', BizCode.BUSINESS_RULE);
    }

    await this.users.update(user.id, {
      password: await bcrypt.hash(newPassword, 10),
      loginFailCount: 0,
      lockedUntil: null,
    });
    this.resetCodes.delete(user.username);
  }

  /* ---------------- 修改密码 ---------------- */

  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.id = :id', { id: userId })
      .getOne();
    if (!user) throw new BusinessException('用户不存在', BizCode.NOT_FOUND, 404);

    const matched = await bcrypt.compare(oldPassword, user.password);
    if (!matched) throw new BusinessException('当前密码不正确', BizCode.BUSINESS_RULE);

    await this.users.update(user.id, {
      password: await bcrypt.hash(newPassword, 10),
      mustChangePassword: false,
    });
  }

  /* ---------------- 内部方法 ---------------- */

  /** JWT 策略使用：校验 token 中的用户仍然有效 */
  async validateUser(payload: JwtPayload): Promise<CurrentUser> {
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user) throw new BusinessException('登录已失效，请重新登录', BizCode.UNAUTHORIZED, 401);
    if (user.status === UserStatus.DISABLED) {
      throw new BusinessException('该账号已停用，请联系管理员', BizCode.FORBIDDEN, 403);
    }
    return this.toCurrentUser(user);
  }

  private async issueToken(user: UserEntity): Promise<AuthResult> {
    const payload: JwtPayload = { sub: user.id, username: user.username, role: user.role };
    const token = await this.jwtService.signAsync(payload);
    return { token, user: this.toCurrentUser(user) };
  }

  toCurrentUser(user: UserEntity): CurrentUser {
    return {
      id: user.id,
      username: user.username,
      realName: user.realName,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
  }
}
