#!/usr/bin/env node
/**
 * 校验 SQL 脚本与后端 TypeORM 实体是否一致（不需要数据库连接）。
 *
 * 用法：node 004.数据库脚本（数据库管理员DBA）/tools/check-schema-sync.js
 *
 * 校验内容：
 *   1. 表名集合一致
 *   2. 列名逐一对上
 *   3. 类型映射正确（实体类型 → MySQL / SQLite 实际类型）
 *   4. 可空性一致
 *   5. 索引的列组合一致
 *   6. 外键的列组合一致
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '..');
const ENTITIES = path.join(REPO, '003.前端代码（前端工程师）', 'backend', 'src', 'entities');

/** 去掉 TS/JS 字面量的引号 */
const unquote = (v) =>
  v === undefined ? undefined : String(v).trim().replace(/^['"`]/, '').replace(/['"`]$/, '');

/* ========== 1. 解析实体 ========== */
function parseEntities() {
  const out = [];
  for (const file of fs.readdirSync(ENTITIES).filter((f) => f.endsWith('.entity.ts'))) {
    const src = fs.readFileSync(path.join(ENTITIES, file), 'utf8');

    const tableMatch = src.match(/@Entity\(['"]([^'"]+)['"]\)/);
    if (!tableMatch) continue;
    const table = tableMatch[1];

    const columns = [];
    const colRe = /@Column\(\s*\{([\s\S]*?)\}\s*\)\s*\n\s*(\w+)(\?)?:/g;
    let m;
    while ((m = colRe.exec(src)) !== null) {
      const [, opts, prop, optional] = m;
      const get = (k) => {
        const mm = opts.match(new RegExp(`(?:^|[{,\\s])${k}:\\s*([^,}]+)`));
        return mm ? unquote(mm[1]) : undefined;
      };
      columns.push({
        prop,
        column: get('name') || prop,
        type: get('type'),
        nullable: get('nullable') === 'true' || Boolean(optional),
        default: get('default'),
        primary: get('primary') === 'true',
        length: get('length'),
        precision: get('precision'),
        scale: get('scale'),
      });
    }

    // 属性级 @Index(...)（无论是否 unique）→ 该属性单独构成一个索引
    // 注意：@Index 与属性之间可能还隔着 @Column 等装饰器，所以不能要求紧邻
    const uniqueProps = [];
    const idxRe = /@Index\(\s*(?:\{[^}]*\}|\s*)\)([\s\S]{0,300}?)\n\s*(\w+)(\?)?:/g;
    while ((m = idxRe.exec(src)) !== null) uniqueProps.push(m[2]);

    // 复合 @Index(['a','b'])
    const composite = [];
    const compRe = /@Index\(\s*\[([^\]]+)\]\s*\)/g;
    while ((m = compRe.exec(src)) !== null) {
      composite.push(
        m[1].split(',').map((s) => unquote(s)).filter(Boolean),
      );
    }

    // @ManyToOne(...) 紧跟 @JoinColumn({ name: 'xxx' })  → 外键列
    const fks = [];
    const relRe = /@ManyToOne\([\s\S]*?\)\s*\n\s*@JoinColumn\(\{[^}]*name:\s*['"]([^'"]+)['"]/g;
    while ((m = relRe.exec(src)) !== null) fks.push(m[1]);

    out.push({ file, table, columns, uniqueProps, composite, fks });
  }
  return out;
}

/* ========== 2. 解析 SQL DDL ========== */
function parseSql(file) {
  const src = fs.readFileSync(file, 'utf8');
  const tables = [];
  const seen = new Set();

  // CREATE TABLE ... ( ... ) 直到行首的 ) 结束
  const tableRe = /CREATE TABLE\s+`?(\w+)`?\s*\(/g;
  let m;
  while ((m = tableRe.exec(src)) !== null) {
    const table = m[1];
    if (seen.has(table)) continue;

    // 从 '(' 开始做括号配平，取出表体
    let depth = 0;
    let i = m.index + m[0].length - 1;
    const start = i + 1;
    for (; i < src.length; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') {
        depth--;
        if (depth === 0) break;
      }
    }
    const body = src.slice(start, i);
    seen.add(table);

    const columns = [];
    for (const line of body.split('\n')) {
      const cm = line.match(/^\s*`?(\w+)`?\s+([a-zA-Z]+(?:\([^)]*\))?)/);
      if (!cm) continue;
      if (/^(PRIMARY|UNIQUE|KEY|CONSTRAINT|FOREIGN|INDEX|CHECK)$/i.test(cm[1])) continue;
      columns.push({
        name: cm[1],
        type: cm[2].toLowerCase(),
        nullable: !/NOT\s+NULL/i.test(line),
      });
    }
    // MySQL 的 KEY/UNIQUE KEY 写在表体内，直接从 body 取
    const indexes = [];
    const keyRe = /(UNIQUE\s+)?(?:KEY|INDEX)\s+`?(\w+)`?\s*\(([^)]+)\)/g;
    let km;
    while ((km = keyRe.exec(body)) !== null) {
      indexes.push({
        cols: km[3].split(',').map((s) => s.trim().replace(/`/g, '')),
        unique: Boolean(km[1]),
      });
    }

    // 外键也写在表体内（FOREIGN KEY (...) REFERENCES table (...)）
    const fks = [];
    const fkRe = /FOREIGN KEY\s*\(([^)]+)\)\s*REFERENCES\s+`?(\w+)`?\s*\(/g;
    let fm;
    while ((fm = fkRe.exec(body)) !== null) {
      fks.push(fm[1].trim().replace(/`/g, ''));
    }

    tables.push({ table, columns, indexes, fks });
  }

  // SQLite 的索引是独立的 CREATE INDEX 语句，按表名归属
  const attachIdx = (table, cols, unique) => {
    const t = tables.find((x) => x.table === table);
    if (t) (t.indexes ||= []).push({ cols, unique });
  };
  let im;
  const cidxRe = /CREATE\s+(UNIQUE\s+)?INDEX\s+`?(\w+)`?\s+ON\s+`?(\w+)`?\s*\(([^)]+)\)/g;
  while ((im = cidxRe.exec(src)) !== null) {
    attachIdx(
      im[3],
      im[4].split(',').map((s) => s.trim().replace(/`/g, '')),
      Boolean(im[1]),
    );
  }

  // 外键已在表体内解析完毕

  return tables;
}

/* ========== 3. 类型映射 ========== */
const TYPE_MAP = {
  mysql: {
    varchar: (c) => `varchar(${c.length || 255})`,
    decimal: (c) => `decimal(${c.precision || 10},${c.scale || 0})`,
    int: () => 'int',
    integer: () => 'int',
    datetime: () => 'datetime(6)',
    boolean: () => 'tinyint(1)',
    text: () => 'text',
  },
  sqlite: {
    varchar: (c) => `varchar(${c.length || 255})`,
    decimal: (c) => `decimal(${c.precision || 10},${c.scale || 0})`,
    int: () => 'integer',
    integer: () => 'integer',
    datetime: () => 'datetime',
    boolean: () => 'boolean',
    text: () => 'text',
  },
};

const norm = (t) => String(t).toLowerCase().replace(/\s+/g, '').replace(/unsigned$/, '');

function checkDialect(dialect) {
  console.log(`\n${'='.repeat(62)}\n  ${dialect.toUpperCase()} 脚本 ↔ 后端实体 一致性校验\n${'='.repeat(62)}`);

  const entities = parseEntities();
  const tables = parseSql(path.join(ROOT, dialect, '01_schema.sql'));
  const sqlByTable = new Map(tables.map((t) => [t.table, t]));
  const map = TYPE_MAP[dialect];
  let failed = 0;

  const ok = (label, pass, detail = '') => {
    if (!pass) {
      console.log(`  ❌ ${label}${detail ? '  ' + detail : ''}`);
      failed++;
    }
  };

  const entTables = entities.map((e) => e.table).sort();
  const sqlTables = tables.map((t) => t.table).sort();
  ok('表名集合一致', JSON.stringify(entTables) === JSON.stringify(sqlTables),
    `实体 ${entTables.join(',')} / 脚本 ${sqlTables.join(',')}`);

  for (const ent of entities) {
    const t = sqlByTable.get(ent.table);
    if (!t) {
      ok(`表 ${ent.table} 存在`, false, '脚本中缺失');
      continue;
    }
    const sqlCols = new Map(t.columns.map((c) => [c.name, c]));

    for (const col of ent.columns) {
      const sc = sqlCols.get(col.column);
      if (!sc) {
        ok(`  ${ent.table}.${col.column} 列存在`, false, '脚本中缺失');
        continue;
      }
      const expected = map[col.type] ? map[col.type](col) : col.type;
      const typeOk = norm(expected) === norm(sc.type);
      const nullOk = col.nullable === sc.nullable;
      ok(
        `  ${ent.table}.${col.column}`,
        typeOk && nullOk,
        `脚本 ${sc.type}` + (typeOk ? '' : ` ≠ 期望 ${expected}`) +
          (nullOk ? '' : ` / 可空性不符(实体${col.nullable ? '可空' : '非空'})`),
      );
    }

    const entIdx = [...ent.uniqueProps.map((p) => [p]), ...ent.composite]
      .map((a) => a.slice().sort())
      .sort((a, b) => a.join().localeCompare(b.join()));
    const sqlIdx = (t.indexes || []).map((i) => i.cols.slice().sort())
      .sort((a, b) => a.join().localeCompare(b.join()));
    ok(`  ${ent.table} 索引列组合一致`, JSON.stringify(entIdx) === JSON.stringify(sqlIdx),
      `实体 ${JSON.stringify(entIdx)} / 脚本 ${JSON.stringify(sqlIdx)}`);

    const entFk = ent.fks.slice().sort();
    const sqlFk = (t.fks || []).slice().sort();
    ok(`  ${ent.table} 外键列一致`, JSON.stringify(entFk) === JSON.stringify(sqlFk),
      `实体 [${entFk}] / 脚本 [${sqlFk}]`);
  }

  // 只输出不通过的项，通过则打印汇总
  console.log(`  ${failed === 0 ? '✅ 全部一致' : `❌ ${failed} 项不一致`}`);
  return failed;
}

let total = 0;
total += checkDialect('mysql');
total += checkDialect('sqlite');

console.log(`\n${'='.repeat(62)}`);
console.log(total === 0 ? '✅ 两种方言均与后端实体一致' : `❌ 共 ${total} 项不一致`);
process.exit(total === 0 ? 0 : 1);
