#!/usr/bin/env node
/**
 * 端到端验证 SQLite 脚本：全新库 → 建表 → 灌数 → 建视图 → 跑巡检。
 *
 * 用法：node 004.数据库脚本（数据库管理员DBA）/tools/test-sqlite-scripts.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.resolve(__dirname, '..');
const SQL = path.join(ROOT, 'sqlite');
const tmpFile = path.join(os.tmpdir(), `material-system-script-test-${Date.now()}.sqlite`);

let failed = 0;
const ok = (label, pass, detail = '') => {
  console.log(`  ${pass ? '✅' : '❌'} ${label}${detail ? '  ' + detail : ''}`);
  if (!pass) failed++;
};

function run(db, file, label) {
  const sql = fs.readFileSync(path.join(SQL, file), 'utf8');
  try {
    db.exec(sql);
    ok(label, true, `(${file})`);
    return true;
  } catch (err) {
    ok(label, false, `(${file}) → ${err.message}`);
    return false;
  }
}

const db = new Database(tmpFile);

console.log('════ 阶段 1：建表 ════');
if (!run(db, '01_schema.sql', '执行 01_schema.sql')) {
  console.log('\n❌ 建表失败，终止');
  process.exit(1);
}

console.log('\n════ 阶段 2：表结构核对 ════');
const EXPECT_COLS = {
  sys_user: ['id', 'username', 'password', 'realName', 'email', 'role', 'status',
    'mustChangePassword', 'loginFailCount', 'lockedUntil', 'lastLoginAt', 'createdAt', 'updatedAt'],
  item: ['id', 'name', 'unit', 'price', 'platform', 'pinyin', 'stock', 'totalInbound',
    'totalOutbound', 'stockValue', 'lastMovedAt', 'status', 'remark', 'createdAt', 'updatedAt'],
  receiver: ['id', 'name', 'remark', 'status', 'createdAt', 'updatedAt'],
  inbound: ['id', 'itemId', 'userId', 'qty', 'orderNo', 'itemName', 'unitSnapshot',
    'unitPrice', 'amount', 'platformSnapshot', 'remark', 'createdAt'],
  outbound: ['id', 'itemId', 'userId', 'receiverId', 'qty', 'itemName', 'unitSnapshot',
    'unitPrice', 'amount', 'receiverName', 'remark', 'createdAt'],
};
for (const [tbl, cols] of Object.entries(EXPECT_COLS)) {
  const got = db.prepare(`PRAGMA table_info("${tbl}")`).all().map((c) => c.name);
  const miss = cols.filter((c) => !got.includes(c));
  ok(`表 ${tbl} 列完整`, miss.length === 0, miss.length ? `缺: ${miss.join(',')}` : `${got.length} 列`);
}

console.log('\n════ 阶段 3：索引与外键 ════');
const EXPECT_IDX = {
  sys_user: ['IDX_9e7164b2f1ea1348bc0eb0a7da'],
  item: ['IDX_c6ae12601fed4e2ee5019544dd', 'IDX_4ba690e333e9d13071a4bc6148'],
  receiver: ['IDX_6a0161b5bdd8b65502fe1fbc14'],
  inbound: ['IDX_2fa434b47c195b5126bc99118b', 'IDX_a6049ad07047201e6b1d9400c0'],
  outbound: ['IDX_4fe11a100abbabf9e0d7d5a7c0', 'IDX_f74f41310efc0895f9940f09e7'],
};
for (const [tbl, idx] of Object.entries(EXPECT_IDX)) {
  const got = db.prepare(`PRAGMA index_list("${tbl}")`).all().map((i) => i.name);
  const miss = idx.filter((i) => !got.includes(i));
  ok(`表 ${tbl} 索引`, miss.length === 0, miss.length ? `缺: ${miss.join(',')}` : `${got.length} 个`);
}
for (const [tbl, expect] of [['inbound', 2], ['outbound', 3]]) {
  const fks = db.prepare(`PRAGMA foreign_key_list("${tbl}")`).all();
  ok(`表 ${tbl} 外键数 = ${expect}`, fks.length === expect, `实际 ${fks.length}`);
}

console.log('\n════ 阶段 4：灌入种子数据 ════');
run(db, '02_seed_data.sql', '执行 02_seed_data.sql');
for (const [tbl, n] of [['sys_user', 4], ['item', 10], ['receiver', 5], ['inbound', 12], ['outbound', 6]]) {
  const c = db.prepare(`SELECT COUNT(*) c FROM "${tbl}"`).get().c;
  ok(`表 ${tbl} 行数 = ${n}`, c === n, `实际 ${c}`);
}

console.log('\n════ 阶段 5：建视图 ════');
run(db, '03_views.sql', '执行 03_views.sql');
const views = db.prepare("SELECT name FROM sqlite_master WHERE type='view'").all().map((v) => v.name);
for (const v of ['v_stock_consistency', 'v_item_stock', 'v_inbound_detail', 'v_outbound_detail']) {
  ok(`视图 ${v} 存在`, views.includes(v));
}

console.log('\n════ 阶段 6：巡检查询 ════');
run(db, '04_verify.sql', '执行 04_verify.sql');

const q = (sql) => db.prepare(sql).all();

// [2] 一致性
const incons = q(`SELECT * FROM v_stock_consistency WHERE 校验结果 = '不一致'`);
ok('[2] 结存一致性无偏差', incons.length === 0, `偏差 ${incons.length} 条`);

// [3] 负结存
const neg = q('SELECT * FROM item WHERE stock < 0');
ok('[3] 无负结存', neg.length === 0, `负结存 ${neg.length} 条`);

// [4] 孤儿
const orph = q(`SELECT
  (SELECT COUNT(*) FROM inbound  b LEFT JOIN item i ON i.id=b.itemId     WHERE i.id IS NULL) a,
  (SELECT COUNT(*) FROM inbound  b LEFT JOIN sys_user u ON u.id=b.userId WHERE u.id IS NULL) b,
  (SELECT COUNT(*) FROM outbound o LEFT JOIN item i ON i.id=o.itemId       WHERE i.id IS NULL) c,
  (SELECT COUNT(*) FROM outbound o LEFT JOIN sys_user u ON u.id=o.userId   WHERE u.id IS NULL) d,
  (SELECT COUNT(*) FROM outbound o LEFT JOIN receiver r ON r.id=o.receiverId WHERE r.id IS NULL) e
`)[0];
ok('[4] 无孤儿记录', orph.a + orph.b + orph.c + orph.d + orph.e === 0,
  `孤儿合计 ${orph.a + orph.b + orph.c + orph.d + orph.e}`);

// [5] 金额
const badAmt = q(`SELECT '入库' t, id FROM inbound  WHERE ABS(amount - qty*unitPrice) > 0.01
                  UNION ALL SELECT '出库', id FROM outbound WHERE ABS(amount - qty*unitPrice) > 0.01`);
ok('[5] 金额 = 数量 × 单价', badAmt.length === 0, `异常 ${badAmt.length} 条`);

// [6] 库存金额
const badVal = q('SELECT id FROM item WHERE ABS(stockValue - ROUND(stock*price,2)) > 0.01');
ok('[6] 库存金额 = 结存 × 零售价', badVal.length === 0, `异常 ${badVal.length} 条`);

// [8] 账号
const users = q('SELECT role, status, COUNT(*) n FROM sys_user GROUP BY role, status');
ok('[8] 账号统计可执行', users.length > 0, JSON.stringify(users));

// [9][10][11] 统计
ok('[9] 采购分析可执行', q('SELECT platformSnapshot FROM inbound GROUP BY platformSnapshot').length > 0);
ok('[10] 消耗排行可执行', q('SELECT itemName FROM outbound GROUP BY itemName').length > 0);
ok('[11] 物资去向可执行', q('SELECT receiverName FROM outbound GROUP BY receiverName').length > 0);

// [12] 健康度
const health = q(`SELECT
  SUM(CASE WHEN stock>0 THEN 1 ELSE 0 END) a,
  SUM(CASE WHEN stock=0 THEN 1 ELSE 0 END) b,
  SUM(CASE WHEN stock<0 THEN 1 ELSE 0 END) c,
  ROUND(SUM(stockValue),2) v FROM item`)[0];
ok('[12] 库存健康度可执行', health.a >= 0 && health.b >= 0,
  `有结存 ${health.a} / 零结存 ${health.b} / 负结存 ${health.c} / 总值 ${health.v}`);

// 密码哈希格式
const hashes = q("SELECT password FROM sys_user").map((r) => r.password);
ok('密码均为 bcrypt 哈希', hashes.every((h) => /^\$2[aby]\$\d{2}\$/.test(h)), `${hashes.length} 个`);

db.close();
fs.rmSync(tmpFile, { force: true });

console.log(failed === 0 ? '\n✅ 全部通过' : `\n❌ ${failed} 项未通过`);
process.exit(failed === 0 ? 0 : 1);
