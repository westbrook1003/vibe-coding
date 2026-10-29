/* eslint-disable no-console */
import { DataSource } from 'typeorm';
import { dataSourceOptions } from './data-source';
import { recalculateStock } from './stock-recalculator';

/**
 * 库存一致性校验 / 修复：`npm run db:recalc`
 * 只重算结存与累计量，不写入任何业务记录。
 */
async function main(): Promise<void> {
  const ds = new DataSource(dataSourceOptions());
  await ds.initialize();

  const { fixed, total } = await recalculateStock(ds);
  console.log(`✅ 库存一致性重算完成：共 ${total} 种物资，修正 ${fixed} 条偏差`);

  await ds.destroy();
}

main().catch((err) => {
  console.error('❌ 库存重算失败：', err);
  process.exit(1);
});
