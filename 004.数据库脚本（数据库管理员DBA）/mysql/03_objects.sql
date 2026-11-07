-- ============================================================================
-- 物资出入库管理系统 · 视图与存储过程（MySQL 8.0+）
-- ----------------------------------------------------------------------------
-- 提供 DBA 巡检与运维能力：
--   v_item_stock            权威结存口径（按流水实时聚合，不依赖冗余字段）
--   v_inbound_detail        入库明细 + 操作人
--   v_outbound_detail       出库明细 + 操作人 + 出库对象
--   v_stock_consistency     冗余结存 vs 流水聚合 的一致性校验
--   sp_recalc_stock()       按流水重算 item 的结存/累计量/库存金额
--   sp_check_stock()        输出一致性校验结果集
--
-- ⚠️ 重要：不要为 inbound/outbound 建"自动改 item.stock"的触发器。
--    应用已在同一事务内维护 stock（PRD G7），触发器会造成重复累加。
-- ============================================================================

USE `material_system`;

-- ----------------------------------------------------------------------------
-- 视图
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS `v_stock_consistency`;
CREATE VIEW `v_stock_consistency` AS
SELECT
  i.`id`                                                        AS `itemId`,
  i.`name`                                                      AS `品名`,
  i.`pinyin`                                                    AS `拼音码`,
  i.`unit`                                                      AS `单位`,
  i.`stock`                                                     AS `结存_冗余字段`,
  COALESCE(ib.`q`, 0) - COALESCE(ob.`q`, 0)                     AS `结存_流水聚合`,
  ROUND(i.`stock` - (COALESCE(ib.`q`, 0) - COALESCE(ob.`q`, 0)), 3) AS `差额`,
  ROUND(i.`totalInbound` - COALESCE(ib.`q`, 0), 3)              AS `累计入库差额`,
  ROUND(i.`totalOutbound` - COALESCE(ob.`q`, 0), 3)             AS `累计出库差额`,
  CASE WHEN ABS(i.`stock` - (COALESCE(ib.`q`, 0) - COALESCE(ob.`q`, 0))) > 0.0001
       THEN '不一致' ELSE '一致' END                             AS `校验结果`
FROM `item` i
LEFT JOIN (SELECT `itemId`, SUM(`qty`) AS `q` FROM `inbound`  GROUP BY `itemId`) ib ON ib.`itemId` = i.`id`
LEFT JOIN (SELECT `itemId`, SUM(`qty`) AS `q` FROM `outbound` GROUP BY `itemId`) ob ON ob.`itemId` = i.`id`;

DROP VIEW IF EXISTS `v_item_stock`;
CREATE VIEW `v_item_stock` AS
SELECT
  i.`id`            AS `itemId`,
  i.`name`          AS `品名`,
  i.`unit`          AS `单位`,
  i.`price`         AS `零售价`,
  i.`platform`      AS `购买平台`,
  i.`pinyin`        AS `拼音码`,
  COALESCE(ib.`q`, 0) - COALESCE(ob.`q`, 0) AS `结存`,
  ROUND((COALESCE(ib.`q`, 0) - COALESCE(ob.`q`, 0)) * i.`price`, 2) AS `库存金额`,
  COALESCE(ib.`q`, 0) AS `累计入库`,
  COALESCE(ob.`q`, 0) AS `累计出库`,
  i.`status`        AS `状态`,
  i.`lastMovedAt`   AS `最近变动`,
  i.`remark`        AS `备注`
FROM `item` i
LEFT JOIN (SELECT `itemId`, SUM(`qty`) AS `q` FROM `inbound`  GROUP BY `itemId`) ib ON ib.`itemId` = i.`id`
LEFT JOIN (SELECT `itemId`, SUM(`qty`) AS `q` FROM `outbound` GROUP BY `itemId`) ob ON ob.`itemId` = i.`id`;

DROP VIEW IF EXISTS `v_inbound_detail`;
CREATE VIEW `v_inbound_detail` AS
SELECT
  b.`id`            AS `入库单号`,
  b.`createdAt`     AS `入库时间`,
  b.`itemName`      AS `品名`,
  b.`unitSnapshot`  AS `单位`,
  b.`qty`           AS `数量`,
  b.`unitPrice`     AS `单价`,
  b.`amount`        AS `金额`,
  b.`orderNo`       AS `订单编号`,
  b.`platformSnapshot` AS `平台`,
  u.`realName`      AS `操作人`,
  b.`remark`        AS `备注`
FROM `inbound` b
JOIN `sys_user` u ON u.`id` = b.`userId`;

DROP VIEW IF EXISTS `v_outbound_detail`;
CREATE VIEW `v_outbound_detail` AS
SELECT
  o.`id`              AS `出库单号`,
  o.`createdAt`       AS `出库时间`,
  o.`itemName`        AS `品名`,
  o.`unitSnapshot`    AS `单位`,
  o.`qty`             AS `数量`,
  o.`unitPrice`       AS `单价`,
  o.`amount`          AS `金额`,
  o.`receiverName`    AS `出库到`,
  u.`realName`        AS `操作人`,
  o.`remark`          AS `备注`
FROM `outbound` o
JOIN `sys_user` u ON u.`id` = o.`userId`;

-- ----------------------------------------------------------------------------
-- 存储过程：按流水重算结存
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_recalc_stock`;
DELIMITER $$
CREATE PROCEDURE `sp_recalc_stock`()
BEGIN
  UPDATE `item` i
  LEFT JOIN (SELECT `itemId`, SUM(`qty`) AS `q` FROM `inbound`  GROUP BY `itemId`) ib ON ib.`itemId` = i.`id`
  LEFT JOIN (SELECT `itemId`, SUM(`qty`) AS `q` FROM `outbound` GROUP BY `itemId`) ob ON ob.`itemId` = i.`id`
  SET
    i.`totalInbound`  = COALESCE(ib.`q`, 0),
    i.`totalOutbound` = COALESCE(ob.`q`, 0),
    i.`stock`         = COALESCE(ib.`q`, 0) - COALESCE(ob.`q`, 0),
    i.`stockValue`    = ROUND((COALESCE(ib.`q`, 0) - COALESCE(ob.`q`, 0)) * i.`price`, 2);

  SELECT ROW_COUNT() AS `受影响行数`;
END$$
DELIMITER ;

-- ----------------------------------------------------------------------------
-- 存储过程：一致性校验
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_check_stock`;
DELIMITER $$
CREATE PROCEDURE `sp_check_stock`()
BEGIN
  SELECT * FROM `v_stock_consistency` WHERE `校验结果` = '不一致';
END$$
DELIMITER ;
