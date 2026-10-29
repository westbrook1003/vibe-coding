#!/usr/bin/env node
/**
 * SQLite 查询小工具 —— 零安装，直接用 node 跑。
 *
 * 用法：
 *   node scripts/db-query.js "SELECT * FROM item"
 *   node scripts/db-query.js "SELECT name, stock FROM item WHERE stock = 0"
 *   node scripts/db-query.js --tables          列出所有表
 *   node scripts/db-query.js --schema item     查看某张表的结构
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

/* ---------- 读取 backend/.env（只认 KEY=VALUE 形式） ---------- */
const envPath = path.resolve(__dirname, '..', '.env');
const env = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
}

const dbFile = path.resolve(
  path.dirname(envPath),
  env.DB_DATABASE || './data/material-system.sqlite',
);

if (!fs.existsSync(dbFile)) {
  console.error(`数据库文件不存在：${dbFile}`);
  console.error('请先执行：npm run seed');
  process.exit(1);
}

const db = new Database(dbFile, { readonly: true });

/* ---------- 中文字符按 2 个宽度计算 ---------- */
function displayWidth(text) {
  let w = 0;
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    w += code > 0x2e80 && code < 0xfe00 ? 2 : 1;
  }
  return w;
}

function pad(text, width) {
  return text + ' '.repeat(Math.max(0, width - displayWidth(text)));
}

/* ---------- 表格化输出 ---------- */
function printTable(rows) {
  if (!rows.length) {
    console.log('(无数据)');
    return;
  }
  const cols = Object.keys(rows[0]);
  const widths = cols.map((c) =>
    Math.max(
      displayWidth(c),
      ...rows.map((r) => displayWidth(r[c] === null ? 'NULL' : String(r[c]))),
    ),
  );

  const line = (cells) =>
    cells.map((cell, i) => pad(String(cell ?? ''), widths[i])).join('  |  ');

  console.log(line(cols));
  console.log(widths.map((w) => '-'.repeat(w)).join('-+-'));
  for (const row of rows) {
    console.log(
      line(cols.map((c) => (row[c] === null ? 'NULL' : String(row[c])))),
    );
  }
  console.log(`(${rows.length} 行)`);
}

/* ---------- 命令分支 ---------- */
const args = process.argv.slice(2);

if (args[0] === '--tables') {
  const tables = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
    )
    .all();
  for (const t of tables) {
    const count = db.prepare(`SELECT COUNT(*) c FROM "${t.name}"`).get().c;
    console.log(`  ${t.name.padEnd(12)} ${String(count).padStart(6)} 行`);
  }
} else if (args[0] === '--schema') {
  const table = args[1];
  if (!table) {
    console.error('用法: node scripts/db-query.js --schema <表名>');
    process.exit(1);
  }
  console.log(`表 ${table}:\n`);
  for (const c of db.prepare(`PRAGMA table_info("${table}")`).all()) {
    console.log(
      `  ${c.name.padEnd(18)} ${String(c.type).padEnd(12)} ${c.pk ? 'PK ' : ''}${c.notnull ? 'NOT NULL ' : ''}${c.dflt_value ? `DEFAULT ${c.dflt_value}` : ''}`,
    );
  }
  const idx = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name=?`)
    .all(table);
  if (idx.length) {
    console.log('\n索引:');
    for (const i of idx) console.log(`  ${i.name}`);
  }
} else if (args.length === 0) {
  console.log('用法:');
  console.log('  node scripts/db-query.js "SELECT * FROM item"');
  console.log('  node scripts/db-query.js --tables');
  console.log('  node scripts/db-query.js --schema item');
  console.log('\n可用表:');
  db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  )
    .all()
    .forEach((r) => console.log('  ' + r.name));
} else {
  try {
    const stmt = db.prepare(args.join(' '));
    if (stmt.reader) {
      printTable(stmt.all());
    } else {
      console.log('执行完成:', stmt.run());
    }
  } catch (err) {
    console.error('SQL 错误:', err.message);
    process.exit(1);
  }
}

db.close();
