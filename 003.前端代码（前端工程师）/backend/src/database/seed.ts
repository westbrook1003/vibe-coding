/* eslint-disable no-console */
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from './data-source';
import { ItemEntity, ItemStatus } from '../entities/item.entity';
import { InboundEntity } from '../entities/inbound.entity';
import { OutboundEntity } from '../entities/outbound.entity';
import { ReceiverEntity, ReceiverStatus } from '../entities/receiver.entity';
import { UserEntity, UserRole, UserStatus } from '../entities/user.entity';
import { recalculateStock } from './stock-recalculator';

/**
 * 演示数据种子脚本：`npm run seed`
 * 幂等 —— 已存在的数据不会重复插入。
 */
async function main(): Promise<void> {
  const ds = new DataSource(dataSourceOptions());
  await ds.initialize();
  console.log('✅ 数据库连接成功，开始写入演示数据…');

  const items = ds.getRepository(ItemEntity);
  const inbounds = ds.getRepository(InboundEntity);
  const outbounds = ds.getRepository(OutboundEntity);
  const receivers = ds.getRepository(ReceiverEntity);
  const users = ds.getRepository(UserEntity);

  /* ---------- 人员 ---------- */
  const demoUsers = [
    { username: 'zhangsan', realName: '张三', email: 'zhangsan@example.com', role: UserRole.ADMIN },
    { username: 'lisi', realName: '李四', email: null, role: UserRole.USER },
    { username: 'wangwu', realName: '王五', email: 'wangwu@example.com', role: UserRole.USER },
  ];
  const userIds: Record<string, number> = {};
  for (const u of demoUsers) {
    let user = await users.findOne({ where: { username: u.username } });
    if (!user) {
      user = await users.save(
        users.create({
          ...u,
          password: await bcrypt.hash('wz123456', 10),
          status: UserStatus.ACTIVE,
          mustChangePassword: false,
        }),
      );
      console.log(`  + 用户 ${u.username}`);
    }
    userIds[u.username] = user.id;
  }

  /* ---------- 出库对象 ---------- */
  const receiverNames = ['张三', '李四', '王五', '项目A施工组', '办公室'];
  const receiverIds: Record<string, number> = {};
  for (const name of receiverNames) {
    let receiver = await receivers.findOne({ where: { name } });
    if (!receiver) {
      receiver = await receivers.save(
        receivers.create({ name, remark: null, status: ReceiverStatus.ACTIVE }),
      );
      console.log(`  + 出库对象 ${name}`);
    }
    receiverIds[name] = receiver.id;
  }

  /* ---------- 物资 ---------- */
  // 拼音码格式为「真实首字母码,别名」：
  // 无线鼠标 的首字母简拼是 wxsb（无 w / 线 x / 鼠 s / 标 b），
  // 而 PRD 与 UI 原型里习惯用 wsm，故把 wsm 作为别名一起登记 —— 两个码都能检索到。
  const demoItems = [
    { name: '无线鼠标', pinyin: 'wxsb,wsm', unit: '个', price: 29.9, platform: '淘宝' },
    { name: '无线鼠标 Pro', pinyin: 'wxsbpro,wsm,sb', unit: '个', price: 89.0, platform: '京东' },
    { name: '数据线', pinyin: 'sjx', unit: '条', price: 12.9, platform: '拼多多' },
    { name: '手机支架', pinyin: 'sjp', unit: '个', price: 18.5, platform: '1688' },
    { name: 'A4 纸', pinyin: 'a4z', unit: '包', price: 23.0, platform: '京东' },
    { name: '签字笔', pinyin: 'qmb,zm', unit: '支', price: 3.5, platform: '淘宝' },
    { name: '插线板', pinyin: 'cxb,ch', unit: '个', price: 45.0, platform: '京东' },
    { name: '抽纸', pinyin: 'cz,cs', unit: '提', price: 32.0, platform: '天猫' },
    { name: '垃圾袋', pinyin: 'ljd,lb', unit: '卷', price: 9.9, platform: '拼多多' },
    { name: '文件夹', pinyin: 'wjj,yj', unit: '个', price: 4.5, platform: '淘宝' },
  ];
  const itemIds: Record<string, number> = {};
  for (const it of demoItems) {
    let item = await items.findOne({ where: { pinyin: it.pinyin } });
    if (!item) {
      item = await items.save(
        items.create({ ...it, status: ItemStatus.ACTIVE, stock: 0, totalInbound: 0, totalOutbound: 0, stockValue: 0 }),
      );
      console.log(`  + 物资 ${it.name} (${it.pinyin})`);
    }
    itemIds[it.pinyin] = item.id;
  }

  /* ---------- 出入库流水 ---------- */
  const existingInbound = await inbounds.count();
  if (existingInbound === 0) {
    const inboundRows = [
      { pinyin: 'wxsb,wsm', qty: 3, orderNo: '20261026T12345', user: 'zhangsan' },
      { pinyin: 'sjx', qty: 5, orderNo: 'PDD2026102609981', user: 'lisi' },
      { pinyin: 'qmb,zm', qty: 20, orderNo: 'TB20251025-44120', user: 'wangwu' },
      { pinyin: 'cxb,ch', qty: 2, orderNo: 'JD20251024-11883', user: 'zhangsan' },
      { pinyin: 'cz,cs', qty: 4, orderNo: 'TM20261025-77321', user: 'zhangsan' },
      { pinyin: 'a4z', qty: 10, orderNo: 'JD20251022-22014', user: 'zhangsan' },
      { pinyin: 'ljd,lb', qty: 10, orderNo: 'PDD20251025-66203', user: 'lisi' },
      { pinyin: 'wjj,yj', qty: 20, orderNo: 'TB20251023-90112', user: 'lisi' },
      { pinyin: 'sjp', qty: 6, orderNo: '1688-20251024-3351', user: 'wangwu' },
      { pinyin: 'wxsb,wsm', qty: 1, orderNo: '20261020T09876', user: 'zhangsan' },
    ];
    for (const row of inboundRows) {
      const item = await items.findOne({ where: { id: itemIds[row.pinyin] } });
      await inbounds.save(
        inbounds.create({
          itemId: item.id,
          userId: userIds[row.user],
          qty: row.qty,
          orderNo: row.orderNo,
          itemName: item.name,
          unitSnapshot: item.unit,
          unitPrice: item.price,
          amount: Math.round(row.qty * item.price * 100) / 100,
          platformSnapshot: item.platform,
          remark: null,
        }),
      );
      item.stock = Math.round((item.stock + row.qty) * 1000) / 1000;
      item.totalInbound = Math.round((item.totalInbound + row.qty) * 1000) / 1000;
      item.stockValue = Math.round(item.stock * item.price * 100) / 100;
      item.lastMovedAt = new Date();
      await items.save(item);
    }
    console.log(`  + 入库记录 ${inboundRows.length} 条`);
  }

  const existingOutbound = await outbounds.count();
  if (existingOutbound === 0) {
    const outboundRows = [
      { pinyin: 'wxsb,wsm', qty: 1, receiver: '张三', user: 'zhangsan' },
      { pinyin: 'qmb,zm', qty: 6, receiver: '李四', user: 'zhangsan' },
      { pinyin: 'a4z', qty: 3, receiver: '办公室', user: 'lisi' },
      { pinyin: 'sjx', qty: 2, receiver: '项目A施工组', user: 'wangwu' },
      { pinyin: 'cxb,ch', qty: 1, receiver: '王五', user: 'zhangsan' },
      { pinyin: 'ljd,lb', qty: 5, receiver: '办公室', user: 'wangwu' },
    ];
    for (const row of outboundRows) {
      const item = await items.findOne({ where: { id: itemIds[row.pinyin] } });
      if (item.stock < row.qty) continue;
      await outbounds.save(
        outbounds.create({
          itemId: item.id,
          userId: userIds[row.user],
          receiverId: receiverIds[row.receiver],
          qty: row.qty,
          itemName: item.name,
          unitSnapshot: item.unit,
          unitPrice: item.price,
          amount: Math.round(row.qty * item.price * 100) / 100,
          receiverName: row.receiver,
          remark: null,
        }),
      );
      item.stock = Math.round((item.stock - row.qty) * 1000) / 1000;
      item.totalOutbound = Math.round((item.totalOutbound + row.qty) * 1000) / 1000;
      item.stockValue = Math.round(item.stock * item.price * 100) / 100;
      item.lastMovedAt = new Date();
      await items.save(item);
    }
    console.log(`  + 出库记录 ${outboundRows.length} 条`);
  }

  console.log('✅ 演示数据写入完成');
  console.log('   演示账号：zhangsan / wz123456（管理员）、lisi / wz123456（普通用户）');

  const { fixed, total } = await recalculateStock(ds);
  console.log(`✅ 库存一致性重算完成：共 ${total} 种物资，修正 ${fixed} 条偏差`);

  await ds.destroy();
}

main().catch((err) => {
  console.error('❌ 种子脚本执行失败：', err);
  process.exit(1);
});
