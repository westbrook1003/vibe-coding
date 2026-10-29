import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InboundEntity } from './inbound.entity';
import { OutboundEntity } from './outbound.entity';

/** 角色：管理员 / 普通用户 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

/** 账号状态 */
export enum UserStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

/**
 * 系统用户（登录账号）。
 * 对应 PRD §5.1 `SYS_USER`。
 */
@Entity('sys_user')
export class UserEntity {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  /** 登录名，唯一，创建后不可修改 */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  username: string;

  /** 加盐哈希后的密码，永不返回给前端 */
  @Column({ type: 'varchar', length: 120, select: false })
  password: string;

  /** 姓名（显示名） */
  @Column({ type: 'varchar', length: 32 })
  realName: string;

  /** 邮箱，用于自助找回密码，可空 */
  @Column({ type: 'varchar', length: 128, nullable: true })
  email: string | null;

  /**
   * 角色与状态用 varchar 存储（SQLite 不支持 enum 列类型），
   * 取值由 TS 枚举 UserRole / UserStatus 约束。
   */
  @Column({ type: 'varchar', length: 16, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'varchar', length: 16, default: UserStatus.ACTIVE })
  status: UserStatus;

  /** 首次登录后必须改密（内置 admin 与管理员新建账号均为 true） */
  @Column({ type: 'boolean', default: false })
  mustChangePassword: boolean;

  /** 登录失败次数，达到阈值后锁定 */
  @Column({ type: 'integer', default: 0 })
  loginFailCount: number;

  /** 锁定截止时间，null 表示未锁定 */
  @Column({ type: 'datetime', nullable: true })
  lockedUntil: Date | null;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  @OneToMany(() => InboundEntity, (inbound) => inbound.user)
  inbounds: InboundEntity[];

  @OneToMany(() => OutboundEntity, (outbound) => outbound.user)
  outbounds: OutboundEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
