import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OutboundEntity } from '../../entities/outbound.entity';
import { ItemEntity } from '../../entities/item.entity';
import { ReceiverEntity, ReceiverStatus } from '../../entities/receiver.entity';
import { ItemService } from '../item/item.service';
import { BusinessException, BizCode } from '../../common/exceptions/business.exception';
import { PageResult } from '../../common/dto/pagination.dto';
import { CreateOutboundDto, OutboundQueryDto } from './outbound.dto';

/** 物资出库（PRD F4） */
@Injectable()
export class OutboundService {
  constructor(
    @InjectRepository(OutboundEntity) private readonly outbounds: Repository<OutboundEntity>,
    @InjectRepository(ReceiverEntity) private readonly receivers: Repository<ReceiverEntity>,
    private readonly itemService: ItemService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 新增出库记录。
   * PRD G2：出库数量不得超过结存，超出则阻断提交。
   * 结存校验在事务内重新读取，避免并发超卖（PRD G7 / G8）。
   */
  async create(dto: CreateOutboundDto, userId: number): Promise<OutboundEntity> {
    const item = await this.itemService.resolve(dto.pinyin);
    const receiverName = dto.receiverName.trim();

    return this.dataSource.transaction(async (manager) => {
      // 事务内重新读取结存，不信任前端传来的库存
      const target = await manager.findOne(ItemEntity, { where: { id: item.id } });
      if (target.stock < dto.qty) {
        const exceed = this.round3(dto.qty - target.stock);
        throw new BusinessException(
          `当前结存为 ${target.stock}，本次出库 ${dto.qty}，超出 ${exceed}`,
          BizCode.BUSINESS_RULE,
        );
      }

      // 出库对象：不存在则自动创建（PRD R4.2）
      let receiver = await manager.findOne(ReceiverEntity, { where: { name: receiverName } });
      if (!receiver) {
        receiver = await manager.save(
          manager.create(ReceiverEntity, {
            name: receiverName,
            remark: null,
            status: ReceiverStatus.ACTIVE,
          }),
        );
      }

      const record = manager.create(OutboundEntity, {
        itemId: target.id,
        userId,
        receiverId: receiver.id,
        qty: dto.qty,
        itemName: target.name,
        unitSnapshot: target.unit,
        unitPrice: target.price,
        amount: this.round2(dto.qty * target.price),
        receiverName: receiver.name,
        remark: dto.remark ?? null,
      });
      const saved = await manager.save(record);

      target.stock = this.round3(target.stock - dto.qty);
      target.totalOutbound = this.round3(target.totalOutbound + dto.qty);
      target.stockValue = this.round2(target.stock * target.price);
      target.lastMovedAt = new Date();
      await manager.save(target);

      return saved;
    });
  }

  async findAll(query: OutboundQueryDto): Promise<PageResult<OutboundEntity>> {
    // 注意：别名不要用 in / out —— 它们是 SQL 保留字
    const qb = this.outbounds
      .createQueryBuilder('ob')
      .leftJoinAndSelect('ob.item', 'it')
      .leftJoinAndSelect('ob.user', 'us');

    if (query.keyword) {
      qb.andWhere(
        '(ob.itemName LIKE :kw OR ob.receiverName LIKE :kw OR it.pinyin LIKE :kw)',
        { kw: `%${query.keyword}%` },
      );
    }
    if (query.receiverId) qb.andWhere('ob.receiverId = :receiverId', { receiverId: query.receiverId });
    if (query.operatorId) qb.andWhere('ob.userId = :operatorId', { operatorId: query.operatorId });
    if (query.dateFrom) qb.andWhere('ob.createdAt >= :dateFrom', { dateFrom: query.dateFrom });
    if (query.dateTo) qb.andWhere('ob.createdAt <= :dateTo', { dateTo: query.dateTo });

    const sortBy = query.sortBy ?? 'createdAt';
    qb.orderBy(`ob.${sortBy}`, query.sortOrder).skip(query.skip).take(query.pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: query.page, pageSize: query.pageSize };
  }

  async findById(id: number): Promise<OutboundEntity> {
    const record = await this.outbounds.findOne({
      where: { id },
      relations: { item: true, user: true, receiver: true },
    });
    if (!record) throw new BusinessException('出库记录不存在', BizCode.NOT_FOUND, 404);
    return record;
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private round3(value: number): number {
    return Math.round((value + Number.EPSILON) * 1000) / 1000;
  }
}
