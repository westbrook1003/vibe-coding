import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemEntity, ItemStatus } from '../../entities/item.entity';
import { InboundEntity } from '../../entities/inbound.entity';
import { OutboundEntity } from '../../entities/outbound.entity';
import { BusinessException, BizCode } from '../../common/exceptions/business.exception';
import { PageResult, PaginationQueryDto } from '../../common/dto/pagination.dto';
import { joinPinyin, matchPinyin, normalizePinyin } from '../../common/utils/pinyin.util';
import { CreateItemDto, ItemQueryDto, PinyinQueryDto, UpdateItemDto } from './item.dto';

/** 物资档案维护（PRD F2） */
@Injectable()
export class ItemService {
  constructor(
    @InjectRepository(ItemEntity) private readonly items: Repository<ItemEntity>,
    @InjectRepository(InboundEntity) private readonly inbounds: Repository<InboundEntity>,
    @InjectRepository(OutboundEntity) private readonly outbounds: Repository<OutboundEntity>,
  ) {}

  async findAll(query: ItemQueryDto): Promise<PageResult<ItemEntity>> {
    const qb = this.items.createQueryBuilder('i');

    if (query.keyword) {
      qb.andWhere('(i.pinyin LIKE :kw OR i.name LIKE :kw)', { kw: `%${query.keyword}%` });
    }
    if (query.platform) qb.andWhere('i.platform = :platform', { platform: query.platform });
    if (query.status) qb.andWhere('i.status = :status', { status: query.status });

    const sortBy = query.sortBy ?? 'updatedAt';
    qb.orderBy(`i.${sortBy}`, query.sortOrder).skip(query.skip).take(query.pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: query.page, pageSize: query.pageSize };
  }

  /**
   * 拼音码联想检索：返回匹配到的物资，前缀命中优先。
   * 只返回启用状态的物资（PRD R3.1 / F2.4.6）。
   */
  async searchByPinyin(query: PinyinQueryDto): Promise<ItemEntity[]> {
    const q = query.q.trim().toLowerCase();
    if (!q) return [];

    const candidates = await this.items
      .createQueryBuilder('i')
      .where('(i.pinyin LIKE :like OR i.name LIKE :like)', { like: `%${q}%` })
      .orderBy('i.lastMovedAt', 'DESC')
      .addOrderBy('i.updatedAt', 'DESC')
      .getMany();

    const scored = candidates
      .map((item) => ({ item, score: matchPinyin(item.pinyin, item.name, q) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((row) => row.item);

    return scored
      .filter((item) => (query.onlyInStock ? item.stock > 0 : true))
      .slice(0, query.limit ?? 20);
  }

  async findById(id: number): Promise<ItemEntity> {
    const item = await this.items.findOne({ where: { id } });
    if (!item) throw new BusinessException('物资不存在', BizCode.NOT_FOUND, 404);
    return item;
  }

  /** 按拼音码或 id 定位物资，供出入库使用 */
  async resolve(pinyinOrId: string | number): Promise<ItemEntity> {
    if (typeof pinyinOrId === 'number') return this.findById(pinyinOrId);

    const codes = normalizePinyin(pinyinOrId);
    if (!codes.length) {
      throw new BusinessException('请输入拼音码', BizCode.INVALID_PARAM);
    }
    // 任一码命中即可（PRD F2.3：多个码用逗号分隔，任一码都能查到）
    const condition = codes
      .map((_, index) => `i.pinyin LIKE :like${index}`)
      .join(' OR ');
    const params: Record<string, string> = {};
    codes.forEach((code, index) => {
      params[`like${index}`] = `%${code}%`;
    });

    const candidates = await this.items
      .createQueryBuilder('i')
      .where('i.status = :status', { status: ItemStatus.ACTIVE })
      .andWhere(`(${condition})`, params)
      .getMany();

    const hit = candidates.find((item) =>
      normalizePinyin(item.pinyin).some((code) => codes.includes(code)),
    );
    if (!hit) {
      throw new BusinessException(`未找到拼音码为「${pinyinOrId}」的启用物资`, BizCode.NOT_FOUND, 404);
    }
    return hit;
  }

  async create(dto: CreateItemDto): Promise<ItemEntity> {
    const item = this.items.create({
      name: dto.name.trim(),
      unit: dto.unit.trim(),
      price: dto.price,
      platform: dto.platform.trim(),
      pinyin: joinPinyin(normalizePinyin(dto.pinyin)),
      remark: dto.remark ?? null,
      status: ItemStatus.ACTIVE,
      stock: 0,
      totalInbound: 0,
      totalOutbound: 0,
      stockValue: 0,
    });
    return this.items.save(item);
  }

  async update(id: number, dto: UpdateItemDto): Promise<ItemEntity> {
    const item = await this.findById(id);
    if (dto.name !== undefined) item.name = dto.name.trim();
    if (dto.unit !== undefined) item.unit = dto.unit.trim();
    if (dto.price !== undefined) {
      item.price = dto.price;
      // 库存金额跟随零售价变化（PRD R6.2）
      item.stockValue = this.round2(item.stock * item.price);
    }
    if (dto.platform !== undefined) item.platform = dto.platform.trim();
    if (dto.pinyin !== undefined) item.pinyin = joinPinyin(normalizePinyin(dto.pinyin));
    if (dto.remark !== undefined) item.remark = dto.remark;
    return this.items.save(item);
  }

  async updateStatus(id: number, status: ItemStatus): Promise<ItemEntity> {
    const item = await this.findById(id);
    item.status = status;
    return this.items.save(item);
  }

  /** F2.4.5：仅当从未产生过出入库记录时才允许删除 */
  async remove(id: number): Promise<void> {
    const item = await this.findById(id);
    const inboundCount = await this.inbounds.count({ where: { itemId: id } });
    const outboundCount = await this.outbounds.count({ where: { itemId: id } });
    if (inboundCount > 0 || outboundCount > 0) {
      throw new BusinessException('该物资已有出入库记录，不可删除，请改为停用', BizCode.BUSINESS_RULE);
    }
    await this.items.remove(item);
  }

  /** 全部物资的下拉选项（用于筛选下拉） */
  async listPlatforms(): Promise<string[]> {
    const rows = await this.items
      .createQueryBuilder('i')
      .select('DISTINCT i.platform', 'platform')
      .orderBy('platform', 'ASC')
      .getRawMany();
    return rows.map((row) => row.platform);
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
