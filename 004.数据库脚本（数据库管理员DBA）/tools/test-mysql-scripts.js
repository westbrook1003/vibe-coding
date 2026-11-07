#!/usr/bin/env node
/**
 * MySQL 脚本端到端验证：建库 → 建表 → 灌数 → 建视图/例程 → 巡检。
 *
 * 用法（Windows cmd）：
 *   set MYSQL_HOST=127.0.0.1
 *   set MYSQL_PORT=3306
 *   set MYSQL_USER=root
 *   set MYSQL_PASSWORD=你的密码
 *   set MYSQL_DATABASE=material_system_script_test
 *   node 004.数据库脚本（数据库管理员DBA）/tools/test-mysql-scripts.js
 *
 * 可选：
 *   MYSQL_KEEP=1   保留测试库（默认跑完即删）
 *
 * ⚠️ 该脚本会 CREATE/DROP 指定的测试库，**不要把 MYSQL_DATABASE 指向生产库**。
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const ROOT = path.resolve(__dirname, '..');
const SQL = path.join(ROOT, 'mysql');

const CFG = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'material_system_script_test',
  multipleStatements: true,
};

let failed = 0;
const ok = (label, pass, detail = '') => {
  console.log(`  ${pass ? '✅' : '❌'} ${label}${detail ? '  ' + detail : ''}`);
  if (!pass) failed++;
};

(async () => {
  console.log(`目标: ${CFG.user}@${CFG.host}:${CFG.port}/${CFG.database}`);
  const admin = await mysql.createConnection({ ...CFG, database: undefined });

  try {
    // ---- 阶段 1：建库 ----
    console.log('\n════ 阶段 1：建库 ════');
    await admin.query(`DROP DATABASE IF EXISTS \`${CFG.database}\``);
    await admin.query(
      `CREATE DATABASE \`${CFG.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );
    ok('建库成功', true, CFG.database);

    const db = await mysql.createConnection(CFG);

    // ---- 阶段 2：表结构 ----
    console.log('\n════ 阶段 2：执行 01_schema.sql ════');
    let sql = fs.readFileSync(path.join(SQL, '01_schema.sql'), 'utf8');
    sql = sql.replace(/CREATE DATABASE[\s\S]*?;/i, '').replace(/USE\s+`?\w+`?;/i, '');
    await db.query(sql);
    ok('建表脚本执行成功', true);

    const EXPECT = {
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
    for (const [tbl, cols] of Object.entries(EXPECT)) {
      const [rows] = await db.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=?`,
        [CFG.database, tbl],
      );
      const got = rows.map((r) => r.COLUMN_NAME);
      const miss = cols.filter((c) => !got.includes(c));
      ok(`表 ${tbl} 列完整`, miss.length === 0, miss.length ? `缺: ${miss.join(',')}` : `${got.length} 列`);
    }

    // ---- 阶段 3：索引与外键 ----
    console.log('\n════ 阶段 3：索引与外键 ════');
    const [idx] = await db.query(
      `SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME, INDEX_NAME`,
      [CFG.database],
    );
    const idxByTable = {};
    for (const r of idx) (idxByTable[r.TABLE_NAME] ||= []).push(r.INDEX_NAME);
    ok('索引已创建', Object.keys(idxByTable).length === 5,
      Object.entries(idxByTable).map(([t, l]) => `${t}:${l.length}`).join(' '));

    const [fks] = await db.query(
      `SELECT TABLE_NAME, COUNT(*) n FROM information_schema.REFERENTIAL_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA=? GROUP BY TABLE_NAME`,
      [CFG.database],
    );
    ok('外键已创建', fks.length === 2, JSON.stringify(fks));

    // ---- 阶段 4：种子数据 ----
    console.log('\n════ 阶段 4：执行 02_seed_data.sql ════');
    sql = fs.readFileSync(path.join(SQL, '02_seed_data.sql'), 'utf8');
    await db.query(sql);
    ok('种子数据导入成功', true);

    for (const [tbl, n] of [['sys_user', 4], ['item', 10], ['receiver', 5], ['inbound', 12], ['outbound', 6]]) {
      const [rows] = await db.query(`SELECT COUNT(*) c FROM \`${tbl}\``);
      ok(`表 ${tbl} 行数 = ${n}`, rows[0].c === n, `实际 ${rows[0].c}`);
    }

    // ---- 阶段 5：视图与例程 ----
    console.log('\n════ 阶段 5：执行 03_objects.sql ════');
    sql = fs.readFileSync(path.join(SQL, '03_objects.sql'), 'utf8');
    sql = sql.replace(/USE\s+`?\w+`?;/i, '');
    await db.query(sql);
    ok('视图与存储过程创建成功', true);

    const [views] = await db.query(
      `SELECT TABLE_NAME FROM information_schema.VIEWS WHERE TABLE_SCHEMA=?`, [CFG.database],
    );
    ok('视图数量 = 4', views.length === 4, views.map((v) => v.TABLE_NAME).join(', '));

    const [procs] = await db.query(
      `SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=?`, [CFG.database],
    );
    ok('存储过程数量 = 2', procs.length === 2, procs.map((p) => p.ROUTINE_NAME).join(', '));

    // ---- 阶段 6：一致性 ----
    console.log('\n════ 阶段 6：巡检 ════');
    const [incons] = await db.query(
      `SELECT * FROM v_stock_consistency WHERE 校验结果 = '不一致'`,
    );
    ok('结存一致性无偏差', incons.length === 0, `偏差 ${incons.length} 条`);

    const [neg] = await db.query('SELECT id, name, stock FROM item WHERE stock < 0');
    ok('无负结存', neg.length === 0, `负结存 ${neg.length} 条`);

    const [orph] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM inbound  b LEFT JOIN item i ON i.id=b.itemId     WHERE i.id IS NULL) a,
        (SELECT COUNT(*) FROM inbound  b LEFT JOIN sys_user u ON u.id=b.userId WHERE u.id IS NULL) b,
        (SELECT COUNT(*) FROM outbound o LEFT JOIN item i ON i.id=o.itemId       WHERE i.id IS NULL) c,
        (SELECT COUNT(*) FROM outbound o LEFT JOIN sys_user u ON u.id=o.userId   WHERE u.id IS NULL) d,
        (SELECT COUNT(*) FROM outbound o LEFT JOIN receiver r ON r.id=o.receiverId WHERE r.id IS NULL) e`);
    ok('无孤儿记录', orph[0].a + orph[0].b + orph[0].c + orph[0].d + orph[0].e === 0,
      `合计 ${orph[0].a + orph[0].b + orph[0].c + orph[0].d + orph[0].e}`);

    const [badAmt] = await db.query(`
      SELECT id FROM inbound  WHERE ABS(amount - qty*unitPrice) > 0.01
      UNION ALL SELECT id FROM outbound WHERE ABS(amount - qty*unitPrice) > 0.01`);
    ok('金额 = 数量 × 单价', badAmt.length === 0, `异常 ${badAmt.length} 条`);

    const [badVal] = await db.query(
      'SELECT id FROM item WHERE ABS(stockValue - ROUND(stock*price,2)) > 0.01',
    );
    ok('库存金额 = 结存 × 零售价', badVal.length === 0, `异常 ${badVal.length} 条`);

    // 存储过程实测
    await db.query('CALL sp_recalc_stock()');
    const [after] = await db.query(
      `SELECT COUNT(*) c FROM v_stock_consistency WHERE 校验结果 = '不一致'`,
    );
    ok('sp_recalc_stock() 执行后仍一致', after[0].c === 0, `偏差 ${after[0].c} 条`);

    // 中文读写（utf8mb4 验证）
    const [cn] = await db.query(
      "SELECT name FROM item WHERE name LIKE '%鼠标%' LIMIT 1",
    );
    ok('中文字段读写正常（utf8mb4）', cn.length === 1 && cn[0].name === '无线鼠标', cn[0]?.name || '');

    // 04_verify.sql 全量跑一遍，确认无语法错误
    console.log('\n════ 阶段 7：执行 04_verify.sql ════');
    const verify = fs.readFileSync(path.join(SQL, '04_verify.sql'), 'utf8')
      .replace(/USE\s+`?\w+`?;/i, '');
    await db.query(verify);
    ok('巡检脚本全部语句执行成功', true);

    await db.end();
  } catch (err) {
    console.error(`\n❌ 执行失败：${err.message}`);
    failed++;
  } finally {
    if (process.env.MYSQL_KEEP !== '1') {
      await admin.query(`DROP DATABASE IF EXISTS \`${CFG.database}\``).catch(() => {});
      console.log(`\n（测试库 ${CFG.database} 已清理；设 MYSQL_KEEP=1 可保留）`);
    }
    await admin.end();
  }

  console.log(failed === 0 ? '\n✅ 全部通过' : `\n❌ ${failed} 项未通过`);
  process.exit(failed === 0 ? 0 : 1);
})();
