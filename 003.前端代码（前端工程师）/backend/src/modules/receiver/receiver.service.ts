import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReceiverEntity, ReceiverStatus } from '../../entities/receiver.entity';
import { OutboundEntity } from '../../entities/outbound.entity';
import { BusinessException, BizCode } from '../../common/exceptions/business.exception';
import { PageResult } from '../../common/dto/pagination.dto';
import { CreateReceiverDto, ReceiverQueryDto, UpdateReceiverDto } from './receiver.dto';

/** 出库对象管理（PRD F4.4） */
@Injectable()
export class ReceiverService {
  constructor(
    @InjectRepository(ReceiverEntity) private readonly receivers: Repository<ReceiverEntity>,
    @InjectRepository(OutboundEntity) private readonly outbounds: Repository<OutboundEntity>,
  ) {}

  async findAll(query: ReceiverQueryDto): Promise<PageResult<ReceiverEntity & { outboundCount: number }>> {
    const qb = this.receivers.createQueryBuilder('r');

    if (query.keyword) {
      qb.andWhere('(r.name LIKE :kw OR r.remark LIKE :kw)', { kw: `%${query.keyword}%` });
    }
    if (query.status) qb.andWhere('r.status = :status', { status: query.status });

    qb.orderBy('r.updatedAt', query.sortOrder).skip(query.skip).take(query.pageSize);

    const [list, total] = await qb.getManyAndCount();

    // 补上出库次数，便于前端展示
    const enriched = await Promise.all(
      list.map(async (receiver) => {
        const outboundCount = await this.outbounds.count({ where: { receiverId: receiver.id } });
        return Object.assign(receiver, { outboundCount });
      }),
    );

    return { list: enriched, total, page: query.page, pageSize: query.pageSize };
  }

  /** 全部启用对象，供出库页下拉选择 */
  async listActive(): Promise<ReceiverEntity[]> {
    return this.receivers.find({
      where: { status: ReceiverStatus.ACTIVE },
      order: { name: 'ASC' },
    });
  }

  async findById(id: number): Promise<ReceiverEntity> {
    const receiver = await this.receivers.findOne({ where: { id } });
    if (!receiver) throw new BusinessException('出库对象不存在', BizCode.NOT_FOUND, 404);
    return receiver;
  }

  async create(dto: CreateReceiverDto): Promise<ReceiverEntity> {
    const name = dto.name.trim();
    const exists = await this.receivers.findOne({ where: { name } });
    if (exists) throw new BusinessException('该出库对象名称已存在', BizCode.CONFLICT, 409);
    return this.receivers.save(
      this.receivers.create({ name, remark: dto.remark ?? null, status: ReceiverStatus.ACTIVE }),
    );
  }

  async update(id: number, dto: UpdateReceiverDto): Promise<ReceiverEntity> {
    const receiver = await this.findById(id);

    if (dto.name && dto.name.trim() !== receiver.name) {
      const exists = await this.receivers.findOne({ where: { name: dto.name.trim() } });
      if (exists) throw new BusinessException('该出库对象名称已存在', BizCode.CONFLICT, 409);
      receiver.name = dto.name.trim();
    }
    if (dto.remark !== undefined) receiver.remark = dto.remark;
    if (dto.status !== undefined) receiver.status = dto.status;

    return this.receivers.save(receiver);
  }

  /** 已有出库记录引用的对象不可删除，仅可停用 */
  async remove(id: number): Promise<void> {
    const receiver = await this.findById(id);
    const count = await this.outbounds.count({ where: { receiverId: id } });
    if (count > 0) {
      throw new BusinessException('该出库对象已有出库记录，不可删除，请改为停用', BizCode.BUSINESS_RULE);
    }
    await this.receivers.remove(receiver);
  }
}
