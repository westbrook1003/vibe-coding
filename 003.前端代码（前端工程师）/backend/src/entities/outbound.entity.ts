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
import { ReceiverEntity } from './receiver.entity';
import { UserEntity } from './user.entity';
import { numericTransformer, quantityTransformer } from '../common/transformers/numeric.transformer';

/**
 * 出库记录。
 * 对应 PRD §5.1 `OUTBOUND`。只增不改不删（PRD G6）。
 */
@Entity('outbound')
@Index(['itemId', 'createdAt'])
@Index(['receiverId'])
export class OutboundEntity {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'integer' })
  itemId: number;

  @ManyToOne(() => ItemEntity, (item) => item.outbounds, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'itemId' })
  item: ItemEntity;

  @Column({ type: 'integer' })
  userId: number;

  @ManyToOne(() => UserEntity, (user) => user.outbounds, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ type: 'integer', nullable: true })
  receiverId: number | null;

  @ManyToOne(() => ReceiverEntity, (receiver) => receiver.outbounds, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'receiverId' })
  receiver: ReceiverEntity;

  /** 数量，> 0 且不得超过结存 */
  @Column({ type: 'decimal', precision: 12, scale: 3, transformer: quantityTransformer })
  qty: number;

  /* ---------- 快照字段 ---------- */
  @Column({ type: 'varchar', length: 64 })
  itemName: string;

  @Column({ type: 'varchar', length: 16 })
  unitSnapshot: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: numericTransformer })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: numericTransformer })
  amount: number;

  /** 出库对象名称快照 */
  @Column({ type: 'varchar', length: 64 })
  receiverName: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  remark: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
