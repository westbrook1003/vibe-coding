import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InboundEntity } from '../../entities/inbound.entity';
import { ItemEntity } from '../../entities/item.entity';
import { ItemService } from '../item/item.service';
import { BusinessException, BizCode } from '../../common/exceptions/business.exception';
import { PageResult } from '../../common/dto/pagination.dto';
import { CreateInboundDto, InboundQueryDto } from './inbound.dto';

/** 物资入库（PRD F3） */
@Injectable()
export class InboundService {
  constructor(
    @InjectRepository(InboundEntity) private readonly inbounds: Repository<InboundEntity>,
    private readonly itemService: ItemService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 新增入库记录。
   * PRD G7：记录写入与结存更新必须在同一事务中，失败整体回滚。
   */
  async create(dto: CreateInboundDto, userId: number): Promise<InboundEntity> {
    const item = await this.itemService.resolve(dto.pinyin);

    return this.dataSource.transaction(async (manager) => {
      const record = manager.create(InboundEntity, {
        itemId: item.id,
        userId,
        qty: dto.qty,
        orderNo: dto.orderNo.trim(),
        // 快照字段：保存提交当时的值，后续改档案不影响历史（PRD G5）
        itemName: item.name,
        unitSnapshot: item.unit,
        unitPrice: item.price,
        amount: this.round2(dto.qty * item.price),
        platformSnapshot: item.platform,
        remark: dto.remark ?? null,
      });
      const saved = await manager.save(record);

      const target = await manager.findOne(ItemEntity, { where: { id: item.id } });
      target.stock = this.round3(target.stock + dto.qty);
      target.totalInbound = this.round3(target.totalInbound + dto.qty);
      target.stockValue = this.round2(target.stock * target.price);
      target.lastMovedAt = new Date();
      await manager.save(target);

      return saved;
    });
  }

  async findAll(query: InboundQueryDto): Promise<PageResult<InboundEntity>> {
    // 注意：别名不要用 in / out —— 它们是 SQL 保留字
    const qb = this.inbounds
      .createQueryBuilder('ib')
      .leftJoinAndSelect('ib.item', 'it')
      .leftJoinAndSelect('ib.user', 'us');

    if (query.keyword) {
      qb.andWhere(
        '(ib.itemName LIKE :kw OR ib.orderNo LIKE :kw OR it.pinyin LIKE :kw)',
        { kw: `%${query.keyword}%` },
      );
    }
    if (query.dateFrom) qb.andWhere('ib.createdAt >= :dateFrom', { dateFrom: query.dateFrom });
    if (query.dateTo) qb.andWhere('ib.createdAt <= :dateTo', { dateTo: query.dateTo });
    if (query.operatorId) qb.andWhere('ib.userId = :operatorId', { operatorId: query.operatorId });

    const sortBy = query.sortBy ?? 'createdAt';
    qb.orderBy(`ib.${sortBy}`, query.sortOrder).skip(query.skip).take(query.pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: query.page, pageSize: query.pageSize };
  }

  async findById(id: number): Promise<InboundEntity> {
    const record = await this.inbounds.findOne({
      where: { id },
      relations: { item: true, user: true },
    });
    if (!record) throw new BusinessException('入库记录不存在', BizCode.NOT_FOUND, 404);
    return record;
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private round3(value: number): number {
    return Math.round((value + Number.EPSILON) * 1000) / 1000;
  }
}
