import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemEntity } from '../../entities/item.entity';
import { InboundEntity } from '../../entities/inbound.entity';
import { OutboundEntity } from '../../entities/outbound.entity';
import { PageResult } from '../../common/dto/pagination.dto';
import { StockQueryDto } from './stock.dto';

export interface StockSummary {
  /** 在库物资种类数 */
  itemCount: number;
  /** 库存总值 */
  totalValue: number;
  /** 本月入库金额 */
  monthInboundAmount: number;
  /** 本月出库金额 */
  monthOutboundAmount: number;
  /** 结存为 0 的物品种类数 */
  zeroStockCount: number;
}

/** 库存查询（PRD F6） */
@Injectable()
export class StockService {
  constructor(
    @InjectRepository(ItemEntity) private readonly items: Repository<ItemEntity>,
    @InjectRepository(InboundEntity) private readonly inbounds: Repository<InboundEntity>,
    @InjectRepository(OutboundEntity) private readonly outbounds: Repository<OutboundEntity>,
  ) {}

  async findAll(query: StockQueryDto): Promise<PageResult<ItemEntity>> {
    const qb = this.items.createQueryBuilder('i');

    if (query.keyword) {
      qb.andWhere('(i.pinyin LIKE :kw OR i.name LIKE :kw)', { kw: `%${query.keyword}%` });
    }
    if (query.platform) qb.andWhere('i.platform = :platform', { platform: query.platform });
    // R6.4：零结存默认隐藏，可通过筛选查看
    if (query.onlyInStock) qb.andWhere('i.stock > 0');
    if (query.onlyZero) qb.andWhere('i.stock = 0');

    const sortBy = query.sortBy ?? 'stockValue';
    qb.orderBy(`i.${sortBy}`, query.sortOrder).skip(query.skip).take(query.pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: query.page, pageSize: query.pageSize };
  }

  async summary(): Promise<StockSummary> {
    const totals = await this.items
      .createQueryBuilder('i')
      .select('COUNT(*)', 'itemCount')
      .addSelect('COALESCE(SUM(i.stockValue), 0)', 'totalValue')
      .addSelect('COALESCE(SUM(CASE WHEN i.stock = 0 THEN 1 ELSE 0 END), 0)', 'zeroStockCount')
      .getRawOne();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const inboundRow = await this.inbounds
      .createQueryBuilder('ib')
      .select('COALESCE(SUM(ib.amount), 0)', 'amount')
      .where('ib.createdAt >= :start AND ib.createdAt < :end', { start: monthStart, end: nextMonth })
      .getRawOne();

    const outboundRow = await this.outbounds
      .createQueryBuilder('ob')
      .select('COALESCE(SUM(ob.amount), 0)', 'amount')
      .where('ob.createdAt >= :start AND ob.createdAt < :end', { start: monthStart, end: nextMonth })
      .getRawOne();

    return {
      itemCount: Number(totals.itemCount ?? 0),
      totalValue: this.round2(Number(totals.totalValue ?? 0)),
      monthInboundAmount: this.round2(Number(inboundRow.amount ?? 0)),
      monthOutboundAmount: this.round2(Number(outboundRow.amount ?? 0)),
      zeroStockCount: Number(totals.zeroStockCount ?? 0),
    };
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
