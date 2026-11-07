-- ============================================================================
-- 物资出入库管理系统 · 巡检与验收查询（SQLite 3）
-- ----------------------------------------------------------------------------
-- 逐条执行；标注「期望」的即为健康基线。
-- 用法：sqlite3 data/material-system.sqlite < 04_verify.sql
-- ============================================================================

-- ── [1] 数据概览 ────────────────────────────────────────────────────────────
-- 期望：5 张表均有数据
SELECT 'sys_user' AS `表`, COUNT(*) AS `行数` FROM `sys_user`
UNION ALL SELECT 'item',        COUNT(*) FROM `item`
UNION ALL SELECT 'receiver',    COUNT(*) FROM `receiver`
UNION ALL SELECT 'inbound',     COUNT(*) FROM `inbound`
UNION ALL SELECT 'outbound',    COUNT(*) FROM `outbound`;

-- ── [2] 结存一致性校验（核心）──────────────────────────────────────────────
-- 期望：0 行（全部「一致」）
SELECT * FROM `v_stock_consistency` WHERE `校验结果` = '不一致';

-- ── [3] 负结存检查 ─────────────────────────────────────────────────────────
-- 期望：0 行（出库不得超过结存，PRD G2）
SELECT `id`, `name`, `pinyin`, `stock` FROM `item` WHERE `stock` < 0;

-- ── [4] 孤儿记录检查（外键完整性）───────────────────────────────────────────
-- 期望：均为 0
SELECT
  (SELECT COUNT(*) FROM `inbound`  b LEFT JOIN `item` i ON i.`id` = b.`itemId`     WHERE i.`id` IS NULL) AS `入库_物资孤儿`,
  (SELECT COUNT(*) FROM `inbound`  b LEFT JOIN `sys_user` u ON u.`id` = b.`userId` WHERE u.`id` IS NULL) AS `入库_用户孤儿`,
  (SELECT COUNT(*) FROM `outbound` o LEFT JOIN `item` i ON i.`id` = o.`itemId`       WHERE i.`id` IS NULL) AS `出库_物资孤儿`,
  (SELECT COUNT(*) FROM `outbound` o LEFT JOIN `sys_user` u ON u.`id` = o.`userId`   WHERE u.`id` IS NULL) AS `出库_用户孤儿`,
  (SELECT COUNT(*) FROM `outbound` o LEFT JOIN `receiver` r ON r.`id` = o.`receiverId` WHERE r.`id` IS NULL) AS `出库_对象孤儿`;

-- ── [5] 数量与金额校验 ─────────────────────────────────────────────────────
-- 期望：均为 0（金额应等于 数量 × 单价，允许 0.01 舍入误差）
SELECT '入库金额' AS `类型`, `id` AS `单号`, `qty`, `unitPrice`, `amount`
FROM `inbound` WHERE ABS(`amount` - `qty` * `unitPrice`) > 0.01
UNION ALL
SELECT '出库金额', `id`, `qty`, `unitPrice`, `amount`
FROM `outbound` WHERE ABS(`amount` - `qty` * `unitPrice`) > 0.01;

-- ── [6] 库存金额校验 ───────────────────────────────────────────────────────
-- 期望：0 行（库存金额 = 结存 × 零售价）
SELECT `id`, `name`, `stock`, `price`, `stockValue`,
       ROUND(`stock` * `price`, 2) AS `应为`
FROM `item` WHERE ABS(`stockValue` - ROUND(`stock` * `price`, 2)) > 0.01;

-- ── [7] 快照 vs 档案差异（预期现象，非故障）────────────────────────────────
-- 说明：快照是「记录发生时」的值，档案后来改过就会不一致，这是设计使然。
SELECT b.`id` AS `入库单号`, b.`itemName` AS `快照品名`, i.`name` AS `当前品名`,
       b.`unitPrice` AS `快照单价`, i.`price` AS `当前单价`
FROM `inbound` b JOIN `item` i ON i.`id` = b.`itemId`
WHERE b.`itemName` <> i.`name` OR b.`unitPrice` <> i.`price`;

-- ── [8] 账号健康度 ─────────────────────────────────────────────────────────
SELECT `role`, `status`, COUNT(*) AS `人数`,
       SUM(CASE WHEN `lockedUntil` IS NOT NULL AND `lockedUntil` > datetime('now') THEN 1 ELSE 0 END) AS `锁定中`,
       SUM(CASE WHEN `mustChangePassword` = 1 THEN 1 ELSE 0 END) AS `待改密`
FROM `sys_user` GROUP BY `role`, `status`;

-- ── [9] 采购分析（按平台）───────────────────────────────────────────────────
SELECT `platformSnapshot` AS `平台`, COUNT(*) AS `笔数`, SUM(`qty`) AS `数量`,
       ROUND(SUM(`amount`), 2) AS `金额`
FROM `inbound` GROUP BY `platformSnapshot` ORDER BY `金额` DESC;

-- ── [10] 物资消耗排行 ──────────────────────────────────────────────────────
SELECT i.`name` AS `品名`, i.`unit` AS `单位`,
       SUM(o.`qty`) AS `累计出库`, ROUND(SUM(o.`amount`), 2) AS `出库金额`,
       i.`stock` AS `当前结存`
FROM `outbound` o JOIN `item` i ON i.`id` = o.`itemId`
GROUP BY i.`id`, i.`name`, i.`unit`, i.`stock`
ORDER BY `累计出库` DESC;

-- ── [11] 物资去向（按出库对象）──────────────────────────────────────────────
SELECT o.`receiverName` AS `出库到`, COUNT(*) AS `笔数`, SUM(o.`qty`) AS `数量`,
       ROUND(SUM(o.`amount`), 2) AS `金额`
FROM `outbound` o GROUP BY o.`receiverName` ORDER BY `金额` DESC;

-- ── [12] 库存健康度 ────────────────────────────────────────────────────────
SELECT
  SUM(CASE WHEN `stock` > 0 THEN 1 ELSE 0 END)   AS `有结存`,
  SUM(CASE WHEN `stock` = 0 THEN 1 ELSE 0 END)   AS `零结存`,
  SUM(CASE WHEN `stock` < 0 THEN 1 ELSE 0 END)   AS `负结存`,
  ROUND(SUM(`stockValue`), 2)                    AS `库存总值`
FROM `item`;
