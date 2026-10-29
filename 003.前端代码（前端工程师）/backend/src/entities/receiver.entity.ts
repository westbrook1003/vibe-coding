import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OutboundEntity } from './outbound.entity';

/** 出库对象启停状态 */
export enum ReceiverStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

/**
 * 出库对象（"物资发给了谁"）。
 * 对应 PRD §5.1 `RECEIVER`。
 *
 * 与系统用户完全独立：这里存的是用户自行定义的自由名称，可以是人名、部门、项目或班组。
 */
@Entity('receiver')
export class ReceiverEntity {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  /** 名称，唯一 */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  name: string;

  /** 备注，如所属部门 / 项目 / 班组 */
  @Column({ type: 'varchar', length: 128, nullable: true })
  remark: string | null;

  /** SQLite 不支持 enum 列类型，用 varchar + TS 枚举约束取值 */
  @Column({ type: 'varchar', length: 16, default: ReceiverStatus.ACTIVE })
  status: ReceiverStatus;

  @OneToMany(() => OutboundEntity, (outbound) => outbound.receiver)
  outbounds: OutboundEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
