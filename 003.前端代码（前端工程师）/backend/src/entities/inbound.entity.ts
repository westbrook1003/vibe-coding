import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ItemEntity } from './item.entity';
import { UserEntity } from './user.entity';
import { numericTransformer, quantityTransformer } from '../common/transformers/numeric.transformer';

/**
 * 入库记录。
 * 对应 PRD §5.1 `INBOUND`。只增不改不删（PRD G6）。
 *
 * 字段分两类：
 *  - 关联字段：itemId / userId，指向当前档案；
 *  - 快照字段：itemName / unitSnapshot / unitPrice / amount，保存提交当时的值，
 *    保证后续修改物资档案不影响历史记录（PRD G5）。
 */
@Entity('inbound')
@Index(['itemId', 'createdAt'])
@Index(['orderNo'])
export class InboundEntity {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'integer' })
  itemId: number;

  @ManyToOne(() => ItemEntity, (item) => item.inbounds, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'itemId' })
  item: ItemEntity;

  @Column({ type: 'integer' })
  userId: number;

  @ManyToOne(() => UserEntity, (user) => user.inbounds, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  /** 数量，> 0，最多 3 位小数 */
  @Column({ type: 'decimal', precision: 12, scale: 3, transformer: quantityTransformer })
  qty: number;

  /** 订单编号，用于回溯这批货从哪来；允许重复（分批到货） */
  @Column({ type: 'varchar', length: 64 })
  orderNo: string;

  /* ---------- 快照字段 ---------- */
  @Column({ type: 'varchar', length: 64 })
  itemName: string;

  @Column({ type: 'varchar', length: 16 })
  unitSnapshot: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: numericTransformer })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: numericTransformer })
  amount: number;

  @Column({ type: 'varchar', length: 32 })
  platformSnapshot: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  remark: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
