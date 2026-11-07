-- ============================================================================
-- 物资出入库管理系统 · 视图与重算脚本（SQLite 3）
-- ----------------------------------------------------------------------------
-- ⚠️ SQLite 无存储过程，等价能力以视图 + UPDATE 语句提供。
-- ⚠️ 不要建"自动改 item.stock"的触发器：应用已在同一事务内维护 stock
--    （PRD G7），触发器会造成重复累加。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 结存一致性校验视图
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS `v_stock_consistency`;
CREATE VIEW `v_stock_consistency` AS
SELECT
  i.`id`                                                          AS `itemId`,
  i.`name`                                                        AS `品名`,
  i.`pinyin`                                                      AS `拼音码`,
  i.`unit`                                                        AS `单位`,
  i.`stock`                                                       AS `结存_冗余字段`,
  COALESCE((SELECT SUM(`qty`) FROM `inbound`  WHERE `itemId` = i.`id`), 0)
  - COALESCE((SELECT SUM(`qty`) FROM `outbound` WHERE `itemId` = i.`id`), 0) AS `结存_流水聚合`,
  ROUND(i.`stock` - (
      COALESCE((SELECT SUM(`qty`) FROM `inbound`  WHERE `itemId` = i.`id`), 0)
    - COALESCE((SELECT SUM(`qty`) FROM `outbound` WHERE `itemId` = i.`id`), 0)
  ), 3)                                                            AS `差额`,
  CASE WHEN ABS(i.`stock` - (
      COALESCE((SELECT SUM(`qty`) FROM `inbound`  WHERE `itemId` = i.`id`), 0)
    - COALESCE((SELECT SUM(`qty`) FROM `outbound` WHERE `itemId` = i.`id`), 0)
  )) > 0.0001 THEN '不一致' ELSE '一致' END                         AS `校验结果`
FROM `item` i;

-- ----------------------------------------------------------------------------
-- 权威结存台账
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS `v_item_stock`;
CREATE VIEW `v_item_stock` AS
SELECT
  i.`id`    AS `itemId`,
  i.`name`  AS `品名`,
  i.`unit`  AS `单位`,
  i.`price` AS `零售价`,
  i.`platform` AS `购买平台`,
  i.`pinyin`   AS `拼音码`,
  COALESCE((SELECT SUM(`qty`) FROM `inbound`  WHERE `itemId` = i.`id`), 0)
  - COALESCE((SELECT SUM(`qty`) FROM `outbound` WHERE `itemId` = i.`id`), 0) AS `结存`,
  ROUND((
      COALESCE((SELECT SUM(`qty`) FROM `inbound`  WHERE `itemId` = i.`id`), 0)
    - COALESCE((SELECT SUM(`qty`) FROM `outbound` WHERE `itemId` = i.`id`), 0)
  ) * i.`price`, 2) AS `库存金额`,
  COALESCE((SELECT SUM(`qty`) FROM `inbound`  WHERE `itemId` = i.`id`), 0) AS `累计入库`,
  COALESCE((SELECT SUM(`qty`) FROM `outbound` WHERE `itemId` = i.`id`), 0) AS `累计出库`,
  i.`status`      AS `状态`,
  i.`lastMovedAt` AS `最近变动`,
  i.`remark`      AS `备注`
FROM `item` i;

-- ----------------------------------------------------------------------------
-- 出入库明细视图
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS `v_inbound_detail`;
CREATE VIEW `v_inbound_detail` AS
SELECT
  b.`id`               AS `入库单号`,
  b.`createdAt`        AS `入库时间`,
  b.`itemName`         AS `品名`,
  b.`unitSnapshot`     AS `单位`,
  b.`qty`              AS `数量`,
  b.`unitPrice`        AS `单价`,
  b.`amount`           AS `金额`,
  b.`orderNo`          AS `订单编号`,
  b.`platformSnapshot` AS `平台`,
  u.`realName`         AS `操作人`,
  b.`remark`           AS `备注`
FROM `inbound` b
JOIN `sys_user` u ON u.`id` = b.`userId`;

DROP VIEW IF EXISTS `v_outbound_detail`;
CREATE VIEW `v_outbound_detail` AS
SELECT
  o.`id`             AS `出库单号`,
  o.`createdAt`      AS `出库时间`,
  o.`itemName`       AS `品名`,
  o.`unitSnapshot`   AS `单位`,
  o.`qty`            AS `数量`,
  o.`unitPrice`      AS `单价`,
  o.`amount`         AS `金额`,
  o.`receiverName`   AS `出库到`,
  u.`realName`       AS `操作人`,
  o.`remark`         AS `备注`
FROM `outbound` o
JOIN `sys_user` u ON u.`id` = o.`userId`;

-- ----------------------------------------------------------------------------
-- 按流水重算结存（SQLite 无存储过程，用 UPDATE 实现）
-- 执行前先跑 04_verify.sql 的「一致性校验」，确认确有偏差再执行
-- ----------------------------------------------------------------------------
-- UPDATE `item` SET
--   `totalInbound`  = COALESCE((SELECT SUM(`qty`) FROM `inbound`  WHERE `itemId` = `item`.`id`), 0),
--   `totalOutbound` = COALESCE((SELECT SUM(`qty`) FROM `outbound` WHERE `itemId` = `item`.`id`), 0),
--   `stock`         = COALESCE((SELECT SUM(`qty`) FROM `inbound`  WHERE `itemId` = `item`.`id`), 0)
--                   - COALESCE((SELECT SUM(`qty`) FROM `outbound` WHERE `itemId` = `item`.`id`), 0),
--   `stockValue`    = ROUND((
--       COALESCE((SELECT SUM(`qty`) FROM `inbound`  WHERE `itemId` = `item`.`id`), 0)
--     - COALESCE((SELECT SUM(`qty`) FROM `outbound` WHERE `itemId` = `item`.`id`), 0)
--   ) * `price`, 2)
-- WHERE 1 = 1;
