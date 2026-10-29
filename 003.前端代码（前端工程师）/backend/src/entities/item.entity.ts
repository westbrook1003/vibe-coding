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
import { numericTransformer, quantityTransformer } from '../common/transformers/numeric.transformer';

/** 物资启停状态 */
export enum ItemStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

/**
 * 物资档案。
 * 对应 PRD §5.1 `ITEM`，对应前端「物资档案」模块。
 */
@Entity('item')
export class ItemEntity {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  /** 品名，允许重名（PRD F2.2） */
  @Index()
  @Column({ type: 'varchar', length: 64 })
  name: string;

  /** 单位：个 / 件 / 套 … */
  @Column({ type: 'varchar', length: 16 })
  unit: string;

  /** 零售价，≥ 0，2 位小数 */
  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: numericTransformer })
  price: number;

  /** 购买平台：淘宝 / 天猫 / 京东 / 拼多多 / 1688 / 线下 … */
  @Column({ type: 'varchar', length: 32 })
  platform: string;

  /**
   * 品名拼音码。多个码用逗号分隔，如 `wsm,sb`；任一码都能检索到该物资。
   * 不做唯一约束（PRD G9）。
   */
  @Index()
  @Column({ type: 'varchar', length: 128 })
  pinyin: string;

  /** 当前结存 = 累计入库 − 累计出库，由出入库事务维护 */
  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0, transformer: quantityTransformer })
  stock: number;

  /** 累计入库量，只增不减 */
  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0, transformer: quantityTransformer })
  totalInbound: number;

  /** 累计出库量，只增不减 */
  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0, transformer: quantityTransformer })
  totalOutbound: number;

  /** 库存金额 = 结存 × 零售价 */
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0, transformer: numericTransformer })
  stockValue: number;

  /** 最近一次出入库时间 */
  @Column({ type: 'datetime', nullable: true })
  lastMovedAt: Date | null;

  /** SQLite 不支持 enum 列类型，用 varchar + TS 枚举约束取值 */
  @Column({ type: 'varchar', length: 16, default: ItemStatus.ACTIVE })
  status: ItemStatus;

  @Column({ type: 'varchar', length: 256, nullable: true })
  remark: string | null;

  @OneToMany(() => InboundEntity, (inbound) => inbound.item)
  inbounds: InboundEntity[];

  @OneToMany(() => OutboundEntity, (outbound) => outbound.item)
  outbounds: OutboundEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
