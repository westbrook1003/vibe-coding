import { DataSource } from 'typeorm';
import { ItemEntity } from '../entities/item.entity';
import { InboundEntity } from '../entities/inbound.entity';
import { OutboundEntity } from '../entities/outbound.entity';

/**
 * 库存一致性重算。
 *
 * 权威口径（PRD G1）：结存 = Σ入库数量 − Σ出库数量。
 *
 * 正常出入库会在同一事务里同步维护 item.stock（PRD G7），
 * 本函数用于**校验 / 修复**历史偏差，例如手工改过数据库、或从旧系统迁移之后。
 */
export async function recalculateStock(ds: DataSource): Promise<{ fixed: number; total: number }> {
  const items = ds.getRepository(ItemEntity);
  const inbounds = ds.getRepository(InboundEntity);
  const outbounds = ds.getRepository(OutboundEntity);

  let fixed = 0;
  const all = await items.find();

  for (const item of all) {
    const inboundRows = await inbounds.find({ where: { itemId: item.id } });
    const outboundRows = await outbounds.find({ where: { itemId: item.id } });

    const totalInbound = inboundRows.reduce((sum, row) => sum + Number(row.qty), 0);
    const totalOutbound = outboundRows.reduce((sum, row) => sum + Number(row.qty), 0);
    const stock = Math.round((totalInbound - totalOutbound) * 1000) / 1000;
    const stockValue = Math.round(stock * Number(item.price) * 100) / 100;
    const lastMovedAt =
      [...inboundRows, ...outboundRows]
        .map((row) => row.createdAt)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    if (
      item.stock !== stock ||
      item.totalInbound !== totalInbound ||
      item.totalOutbound !== totalOutbound ||
      item.stockValue !== stockValue
    ) {
      fixed += 1;
    }

    item.stock = stock;
    item.totalInbound = Math.round(totalInbound * 1000) / 1000;
    item.totalOutbound = Math.round(totalOutbound * 1000) / 1000;
    item.stockValue = stockValue;
    item.lastMovedAt = lastMovedAt;
    await items.save(item);
  }

  return { fixed, total: all.length };
}
