#!/usr/bin/env node
/**
 * 从运行中的 SQLite 库导出种子数据 SQL（MySQL / SQLite 两个版本）。
 *
 * 用法：
 *   node 004.数据库脚本（数据库管理员DBA）/tools/gen-seed-sql.js
 *
 * 为什么用脚本而不是手写：
 *   导出的 INSERT 与应用实际跑出来的数据逐字一致，
 *   避免手写脚本与后端 seed.ts 漂移。
 *
 * 注意：密码字段会重新生成 bcrypt 哈希（每次结果不同但都可校验通过）。
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const OUT_ROOT = path.resolve(__dirname, '..');
const BACKEND = path.resolve(OUT_ROOT, '..', '003.前端代码（前端工程师）', 'backend');

// ---- 定位 SQLite 库 ----
function resolveDbFile() {
  const envPath = path.join(BACKEND, '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  }
  return path.resolve(BACKEND, env.DB_DATABASE || './data/material-system.sqlite');
}

const dbFile = resolveDbFile();
if (!fs.existsSync(dbFile)) {
  console.error(`❌ 找不到数据库：${dbFile}\n   请先在 backend 目录执行 npm run seed`);
  process.exit(1);
}
const db = new Database(dbFile, { readonly: true });

/** 转义成 SQL 字符串字面量 */
function q(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

const now = new Date().toISOString().replace('T', ' ').slice(0, 23);

function insertRows(table, rows, overrides = {}) {
  if (!rows.length) return `-- ${table}: 无数据\n`;
  // override 的列同样要出现在 INSERT 列表里，只是取值由 override 函数提供
  const cols = Object.keys(rows[0]);
  const lines = rows.map((r) => {
    const vals = cols.map((c) => (overrides[c] ? overrides[c](r) : q(r[c])));
    return `  (${vals.join(', ')})`;
  });
  return (
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES\n` +
    lines.join(',\n') +
    ';\n'
  );
}

/* ================= 读取数据 ================= */
const users = db.prepare('SELECT * FROM sys_user ORDER BY id').all();
const items = db.prepare('SELECT * FROM item ORDER BY id').all();
const receivers = db.prepare('SELECT * FROM receiver ORDER BY id').all();
const inbounds = db.prepare('SELECT * FROM inbound ORDER BY id').all();
const outbounds = db.prepare('SELECT * FROM outbound ORDER BY id').all();

// 重新生成 bcrypt 哈希（保证脚本自洽）
const usersWithHash = users.map((u) => ({
  ...u,
  password: bcrypt.hashSync(u.username === 'admin' ? 'admin' : 'wz123456', 10),
}));

/* ================= 生成 SQL ================= */
function buildSql(dialect) {
  const mysql = dialect === 'mysql';
  const nowFn = mysql ? 'NOW(3)' : "datetime('now')";
  const bool = (v) => (mysql ? (v ? '1' : '0') : v ? '1' : '0');
  const dec = (v) => (v === null ? 'NULL' : String(v));

  let out = '';
  out += `-- ============================================================\n`;
  out += `-- 物资出入库管理系统 · 演示种子数据（${dialect === 'mysql' ? 'MySQL 8.0+' : 'SQLite 3'}）\n`;
  out += `-- 生成时间: ${now}\n`;
  out += `-- 账号说明:\n`;
  out += `--   admin    / admin      管理员（内置，首次登录需强制改密）\n`;
  out += `--   zhangsan / wz123456   管理员\n`;
  out += `--   lisi     / wz123456   普通用户\n`;
  out += `--   wangwu   / wz123456   普通用户\n`;
  out += `--\n`;
  out += `-- 重复执行前请先清空:\n`;
  out += `--   ${mysql ? 'SET FOREIGN_KEY_CHECKS=0;' : 'PRAGMA foreign_keys=OFF;'}\n`;
  out += `--   ${mysql ? 'TRUNCATE TABLE inbound; TRUNCATE TABLE outbound;' : 'DELETE FROM inbound; DELETE FROM outbound;'}\n`;
  out += `--   ${mysql ? 'TRUNCATE TABLE receiver;' : 'DELETE FROM receiver;'}\n`;
  out += `--   ${mysql ? 'TRUNCATE TABLE item;' : 'DELETE FROM item;'}\n`;
  out += `--   ${mysql ? 'TRUNCATE TABLE sys_user;' : 'DELETE FROM sys_user;'}\n`;
  out += `--   ${mysql ? 'SET FOREIGN_KEY_CHECKS=1;' : 'PRAGMA foreign_keys=ON;'}\n`;
  out += `-- ============================================================\n\n`;

  out += '-- ---------- 用户 ----------\n';
  out += insertRows('sys_user', usersWithHash, {
    password: (r) => q(r.password),
    createdAt: () => nowFn,
    updatedAt: () => nowFn,
    mustChangePassword: (r) => bool(r.mustChangePassword),
  });
  out += '\n';

  out += '-- ---------- 出库对象 ----------\n';
  out += insertRows('receiver', receivers, {
    createdAt: () => nowFn,
    updatedAt: () => nowFn,
  });
  out += '\n';

  out += '-- ---------- 物资档案（结存为冗余字段，由出入库事务维护）----------\n';
  out += insertRows('item', items, {
    createdAt: () => nowFn,
    updatedAt: () => nowFn,
    stock: (r) => dec(r.stock),
    totalInbound: (r) => dec(r.totalInbound),
    totalOutbound: (r) => dec(r.totalOutbound),
    stockValue: (r) => dec(r.stockValue),
  });
  out += '\n';

  out += '-- ---------- 入库记录 ----------\n';
  out += insertRows('inbound', inbounds, {
    createdAt: () => nowFn,
    qty: (r) => dec(r.qty),
    unitPrice: (r) => dec(r.unitPrice),
    amount: (r) => dec(r.amount),
  });
  out += '\n';

  out += '-- ---------- 出库记录 ----------\n';
  out += insertRows('outbound', outbounds, {
    createdAt: () => nowFn,
    qty: (r) => dec(r.qty),
    unitPrice: (r) => dec(r.unitPrice),
    amount: (r) => dec(r.amount),
  });

  return out;
}

for (const dialect of ['mysql', 'sqlite']) {
  const dir = path.join(OUT_ROOT, dialect);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, '02_seed_data.sql');
  fs.writeFileSync(file, buildSql(dialect), 'utf8');
  console.log(`✅ 已生成 ${path.relative(OUT_ROOT, file)}`);
}

db.close();
