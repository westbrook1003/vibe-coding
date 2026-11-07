-- ============================================================================
-- 物资出入库管理系统 · 表结构（SQLite 3）
-- ----------------------------------------------------------------------------
-- 对应 PRD §5「数据模型」与后端 TypeORM 实体：
--   backend/src/entities/{user,item,inbound,outbound,receiver}.entity.ts
--
-- 本脚本与后端 TypeORM synchronize 自动生成的表结构逐字一致（已用
-- PRAGMA table_info / index_list / foreign_key_list 核对）。
--
-- 执行顺序：01_schema.sql → 02_seed_data.sql → 03_views.sql → 04_verify.sql
-- ============================================================================

PRAGMA foreign_keys = OFF;

-- ----------------------------------------------------------------------------
-- sys_user —— 系统用户（登录账号）
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `sys_user`;
CREATE TABLE `sys_user` (
  `id`                  INTEGER     NOT NULL PRIMARY KEY AUTOINCREMENT,
  `username`            varchar(32) NOT NULL,
  `password`            varchar(120) NOT NULL,
  `realName`            varchar(32) NOT NULL,
  `email`               varchar(128),
  `role`                varchar(16) NOT NULL DEFAULT 'user',
  `status`              varchar(16) NOT NULL DEFAULT 'active',
  `mustChangePassword`  boolean     NOT NULL DEFAULT 0,
  `loginFailCount`      INTEGER     NOT NULL DEFAULT 0,
  `lockedUntil`         datetime,
  `lastLoginAt`         datetime,
  `createdAt`           datetime    NOT NULL DEFAULT (datetime('now')),
  `updatedAt`           datetime    NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX `IDX_9e7164b2f1ea1348bc0eb0a7da` ON `sys_user` (`username`);

-- ----------------------------------------------------------------------------
-- receiver —— 出库对象
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `receiver`;
CREATE TABLE `receiver` (
  `id`          INTEGER     NOT NULL PRIMARY KEY AUTOINCREMENT,
  `name`        varchar(64) NOT NULL,
  `remark`      varchar(128),
  `status`      varchar(16) NOT NULL DEFAULT 'active',
  `createdAt`   datetime    NOT NULL DEFAULT (datetime('now')),
  `updatedAt`   datetime    NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX `IDX_6a0161b5bdd8b65502fe1fbc14` ON `receiver` (`name`);

-- ----------------------------------------------------------------------------
-- item —— 物资档案
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `item`;
CREATE TABLE `item` (
  `id`            INTEGER       NOT NULL PRIMARY KEY AUTOINCREMENT,
  `name`          varchar(64)   NOT NULL,
  `unit`          varchar(16)   NOT NULL,
  `price`         decimal(12,2) NOT NULL DEFAULT 0.00,
  `platform`      varchar(32)   NOT NULL,
  `pinyin`        varchar(128)  NOT NULL,
  `stock`         decimal(12,3) NOT NULL DEFAULT 0.000,
  `totalInbound`  decimal(12,3) NOT NULL DEFAULT 0.000,
  `totalOutbound` decimal(12,3) NOT NULL DEFAULT 0.000,
  `stockValue`    decimal(14,2) NOT NULL DEFAULT 0.00,
  `lastMovedAt`   datetime,
  `status`        varchar(16)   NOT NULL DEFAULT 'active',
  `remark`        varchar(256),
  `createdAt`     datetime      NOT NULL DEFAULT (datetime('now')),
  `updatedAt`     datetime      NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX `IDX_c6ae12601fed4e2ee5019544dd` ON `item` (`name`);
CREATE INDEX `IDX_4ba690e333e9d13071a4bc6148` ON `item` (`pinyin`);

-- ----------------------------------------------------------------------------
-- inbound —— 入库记录
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `inbound`;
CREATE TABLE `inbound` (
  `id`              INTEGER       NOT NULL PRIMARY KEY AUTOINCREMENT,
  `itemId`          INTEGER       NOT NULL,
  `userId`          INTEGER       NOT NULL,
  `qty`             decimal(12,3) NOT NULL,
  `orderNo`         varchar(64)   NOT NULL,
  `itemName`        varchar(64)   NOT NULL,
  `unitSnapshot`    varchar(16)   NOT NULL,
  `unitPrice`       decimal(12,2) NOT NULL,
  `amount`          decimal(14,2) NOT NULL,
  `platformSnapshot` varchar(32)  NOT NULL,
  `remark`          varchar(256),
  `createdAt`       datetime      NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (`itemId`) REFERENCES `item` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`userId`) REFERENCES `sys_user` (`id`) ON DELETE RESTRICT
);
CREATE INDEX `IDX_2fa434b47c195b5126bc99118b` ON `inbound` (`itemId`, `createdAt`);
CREATE INDEX `IDX_a6049ad07047201e6b1d9400c0` ON `inbound` (`orderNo`);

-- ----------------------------------------------------------------------------
-- outbound —— 出库记录
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `outbound`;
CREATE TABLE `outbound` (
  `id`              INTEGER       NOT NULL PRIMARY KEY AUTOINCREMENT,
  `itemId`          INTEGER       NOT NULL,
  `userId`          INTEGER       NOT NULL,
  `receiverId`      INTEGER,
  `qty`             decimal(12,3) NOT NULL,
  `itemName`        varchar(64)   NOT NULL,
  `unitSnapshot`    varchar(16)   NOT NULL,
  `unitPrice`       decimal(12,2) NOT NULL,
  `amount`          decimal(14,2) NOT NULL,
  `receiverName`    varchar(64)   NOT NULL,
  `remark`          varchar(256),
  `createdAt`       datetime      NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (`itemId`)     REFERENCES `item` (`id`)     ON DELETE RESTRICT,
  FOREIGN KEY (`userId`)     REFERENCES `sys_user` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`receiverId`) REFERENCES `receiver` (`id`) ON DELETE SET NULL
);
CREATE INDEX `IDX_4fe11a100abbabf9e0d7d5a7c0` ON `outbound` (`itemId`, `createdAt`);
CREATE INDEX `IDX_f74f41310efc0895f9940f09e7` ON `outbound` (`receiverId`);

PRAGMA foreign_keys = ON;
