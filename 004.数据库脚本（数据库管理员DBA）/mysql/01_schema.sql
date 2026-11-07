-- ============================================================================
-- 物资出入库管理系统 · 表结构（MySQL 8.0+）
-- ----------------------------------------------------------------------------
-- 对应 PRD §5「数据模型」与后端 TypeORM 实体：
--   backend/src/entities/{user,item,inbound,outbound,receiver}.entity.ts
--
-- 列名、类型、精度与 TypeORM 的 MySQL 映射逐一对齐：
--   datetime → datetime(6)   boolean → tinyint(1)   int → int
--   decimal(p,s) / varchar(n) 保持一致
--   索引名沿用 TypeORM 生成的 IDX_<hash>，使 DB_SYNCHRONIZE 开启时也不会重建索引
--
-- 执行顺序：01_schema.sql → 02_seed_data.sql → 03_objects.sql → 04_verify.sql
-- 生产环境请把后端 .env 的 DB_SYNCHRONIZE 设为 false，改由本脚本管理结构
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `material_system`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE `material_system`;

-- ----------------------------------------------------------------------------
-- sys_user —— 系统用户（登录账号）
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `sys_user`;
CREATE TABLE `sys_user` (
  `id`                   INT           NOT NULL AUTO_INCREMENT,
  `username`             VARCHAR(32)   NOT NULL COMMENT '登录名，全局唯一，创建后不可修改',
  `password`             VARCHAR(120)  NOT NULL COMMENT 'bcrypt 加盐哈希，绝不可存明文',
  `realName`             VARCHAR(32)   NOT NULL COMMENT '姓名（显示名）',
  `email`                VARCHAR(128)  NULL     COMMENT '邮箱，用于自助找回密码',
  `role`                 VARCHAR(16)   NOT NULL DEFAULT 'user' COMMENT '角色：admin=管理员 / user=普通用户',
  `status`               VARCHAR(16)   NOT NULL DEFAULT 'active' COMMENT '状态：active=启用 / disabled=停用',
  `mustChangePassword`   TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '是否强制改密（首登、管理员新建账号为 1）',
  `loginFailCount`       INT           NOT NULL DEFAULT 0 COMMENT '连续登录失败次数，达阈值锁定',
  `lockedUntil`          DATETIME(6)   NULL     COMMENT '锁定截止时间，NULL 表示未锁定',
  `lastLoginAt`          DATETIME(6)   NULL     COMMENT '最近登录时间',
  `createdAt`            DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt`            DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_9e7164b2f1ea1348bc0eb0a7da` (`username`),
  CONSTRAINT `chk_sys_user_role`   CHECK (`role`   IN ('admin', 'user')),
  CONSTRAINT `chk_sys_user_status` CHECK (`status` IN ('active', 'disabled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='系统用户';

-- ----------------------------------------------------------------------------
-- receiver —— 出库对象（"物资发给了谁"，独立于系统账号的自由名称）
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `receiver`;
CREATE TABLE `receiver` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(64)  NOT NULL COMMENT '出库对象名称，唯一',
  `remark`      VARCHAR(128) NULL     COMMENT '备注：所属部门 / 项目 / 班组',
  `status`      VARCHAR(16)  NOT NULL DEFAULT 'active' COMMENT '状态：active=启用 / disabled=停用',
  `createdAt`   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt`   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_6a0161b5bdd8b65502fe1fbc14` (`name`),
  CONSTRAINT `chk_receiver_status` CHECK (`status` IN ('active', 'disabled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='出库对象名单';

-- ----------------------------------------------------------------------------
-- item —— 物资档案
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `item`;
CREATE TABLE `item` (
  `id`             INT           NOT NULL AUTO_INCREMENT,
  `name`           VARCHAR(64)   NOT NULL COMMENT '品名，允许重名（不同规格/店铺）',
  `unit`           VARCHAR(16)   NOT NULL COMMENT '单位：个/件/套/盒/包/瓶/袋/箱/卷/米/千克/张/台/支',
  `price`          DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '零售价，>= 0',
  `platform`       VARCHAR(32)   NOT NULL COMMENT '购买平台：淘宝/天猫/京东/拼多多/1688/线下…',
  `pinyin`         VARCHAR(128)  NOT NULL COMMENT '品名拼音码，多个码逗号分隔，如 wxsb,wsm；不校验唯一',
  `stock`          DECIMAL(12,3) NOT NULL DEFAULT 0.000 COMMENT '当前结存（冗余，由出入库事务维护）',
  `totalInbound`   DECIMAL(12,3) NOT NULL DEFAULT 0.000 COMMENT '累计入库量（只增）',
  `totalOutbound`  DECIMAL(12,3) NOT NULL DEFAULT 0.000 COMMENT '累计出库量（只增）',
  `stockValue`     DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT '库存金额 = 结存 × 零售价（冗余）',
  `lastMovedAt`    DATETIME(6)   NULL     COMMENT '最近一次出入库时间',
  `status`         VARCHAR(16)   NOT NULL DEFAULT 'active' COMMENT '状态：active=启用 / disabled=停用',
  `remark`         VARCHAR(256)  NULL     COMMENT '备注',
  `createdAt`      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt`      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_c6ae12601fed4e2ee5019544dd` (`name`),
  KEY `IDX_4ba690e333e9d13071a4bc6148` (`pinyin`),
  CONSTRAINT `chk_item_price` CHECK (`price` >= 0),
  CONSTRAINT `chk_item_status` CHECK (`status` IN ('active', 'disabled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='物资档案';

-- ----------------------------------------------------------------------------
-- inbound —— 入库记录（只增不改不删）
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `inbound`;
CREATE TABLE `inbound` (
  `id`              INT           NOT NULL AUTO_INCREMENT,
  `itemId`          INT           NOT NULL COMMENT '物资 id',
  `userId`          INT           NOT NULL COMMENT '操作人 id',
  `qty`             DECIMAL(12,3) NOT NULL COMMENT '数量，> 0',
  `orderNo`         VARCHAR(64)   NOT NULL COMMENT '订单编号，允许重复（分批到货）',
  `itemName`        VARCHAR(64)   NOT NULL COMMENT '品名快照',
  `unitSnapshot`    VARCHAR(16)   NOT NULL COMMENT '单位快照',
  `unitPrice`       DECIMAL(12,2) NOT NULL COMMENT '单价快照',
  `amount`          DECIMAL(14,2) NOT NULL COMMENT '金额快照 = 数量 × 单价',
  `platformSnapshot` VARCHAR(32)  NOT NULL COMMENT '购买平台快照',
  `remark`          VARCHAR(256)  NULL     COMMENT '备注',
  `createdAt`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_2fa434b47c195b5126bc99118b` (`itemId`, `createdAt`),
  KEY `IDX_a6049ad07047201e6b1d9400c0` (`orderNo`),
  CONSTRAINT `fk_inbound_item` FOREIGN KEY (`itemId`) REFERENCES `item` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_inbound_user` FOREIGN KEY (`userId`) REFERENCES `sys_user` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_inbound_qty` CHECK (`qty` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='入库记录';

-- ----------------------------------------------------------------------------
-- outbound —— 出库记录（只增不改不删）
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `outbound`;
CREATE TABLE `outbound` (
  `id`              INT           NOT NULL AUTO_INCREMENT,
  `itemId`          INT           NOT NULL COMMENT '物资 id',
  `userId`          INT           NOT NULL COMMENT '操作人 id',
  `receiverId`      INT           NULL     COMMENT '出库对象 id',
  `qty`             DECIMAL(12,3) NOT NULL COMMENT '数量，> 0 且不得超过结存',
  `itemName`        VARCHAR(64)   NOT NULL COMMENT '品名快照',
  `unitSnapshot`    VARCHAR(16)   NOT NULL COMMENT '单位快照',
  `unitPrice`       DECIMAL(12,2) NOT NULL COMMENT '单价快照',
  `amount`          DECIMAL(14,2) NOT NULL COMMENT '金额快照',
  `receiverName`    VARCHAR(64)   NOT NULL COMMENT '出库对象名称快照',
  `remark`          VARCHAR(256)  NULL     COMMENT '备注',
  `createdAt`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_4fe11a100abbabf9e0d7d5a7c0` (`itemId`, `createdAt`),
  KEY `IDX_f74f41310efc0895f9940f09e7` (`receiverId`),
  CONSTRAINT `fk_outbound_item`     FOREIGN KEY (`itemId`)     REFERENCES `item` (`id`)     ON DELETE RESTRICT,
  CONSTRAINT `fk_outbound_user`     FOREIGN KEY (`userId`)     REFERENCES `sys_user` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_outbound_receiver` FOREIGN KEY (`receiverId`) REFERENCES `receiver` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_outbound_qty` CHECK (`qty` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='出库记录';
