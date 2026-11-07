#!/usr/bin/env node
/** 校验生成的种子 SQL 是否覆盖全部列、且行数与活库一致。 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const EXPECT = {
  sys_user: [
    'id', 'username', 'password', 'realName', 'email', 'role', 'status',
    'mustChangePassword', 'loginFailCount', 'lockedUntil', 'lastLoginAt',
    'createdAt', 'updatedAt',
  ],
  item: [
    'id', 'name', 'unit', 'price', 'platform', 'pinyin', 'stock',
    'totalInbound', 'totalOutbound', 'stockValue', 'lastMovedAt', 'status',
    'remark', 'createdAt', 'updatedAt',
  ],
  receiver: ['id', 'name', 'remark', 'status', 'createdAt', 'updatedAt'],
  inbound: [
    'id', 'itemId', 'userId', 'qty', 'orderNo', 'itemName', 'unitSnapshot',
    'unitPrice', 'amount', 'platformSnapshot', 'remark', 'createdAt',
  ],
  outbound: [
    'id', 'itemId', 'userId', 'receiverId', 'qty', 'itemName', 'unitSnapshot',
    'unitPrice', 'amount', 'receiverName', 'remark', 'createdAt',
  ],
};

let failed = 0;
for (const dialect of ['mysql', 'sqlite']) {
  const file = path.join(ROOT, dialect, '02_seed_data.sql');
  const text = fs.readFileSync(file, 'utf8');
  console.log(`\n════ ${dialect}/02_seed_data.sql ════`);

  for (const [table, cols] of Object.entries(EXPECT)) {
    const re = new RegExp(`INSERT INTO ${table} \\(([^)]*)\\) VALUES`);
    const m = text.match(re);
    if (!m) {
      console.log(`  ❌ ${table}: 未找到 INSERT 语句`);
      failed++;
      continue;
    }
    const have = m[1].split(',').map((s) => s.trim());
    const miss = cols.filter((c) => !have.includes(c));
    const extra = have.filter((c) => !cols.includes(c));

    // 数一下 VALUES 里的行数
    const block = text.slice(m.index);
    const end = block.indexOf(';');
    const rows = (block.slice(0, end).match(/^\s{2}\(/gm) || []).length;

    const ok = miss.length === 0 && extra.length === 0;
    if (!ok) failed++;
    console.log(
      `  ${ok ? '✅' : '❌'} ${table.padEnd(10)} ${have.length} 列 / ${rows} 行` +
        (miss.length ? `  缺列: ${miss.join(',')}` : '') +
        (extra.length ? `  多余列: ${extra.join(',')}` : ''),
    );
  }

  // 密码哈希必须存在且是 bcrypt 格式
  const hashes = text.match(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g) || [];
  console.log(`  ${hashes.length === 4 ? '✅' : '❌'} bcrypt 密码哈希 ${hashes.length}/4 个`);
  if (hashes.length !== 4) failed++;
}

console.log(failed === 0 ? '\n✅ 全部校验通过' : `\n❌ ${failed} 项不通过`);
process.exit(failed === 0 ? 0 : 1);
