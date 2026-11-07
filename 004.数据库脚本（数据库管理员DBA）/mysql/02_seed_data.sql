-- ============================================================
-- 物资出入库管理系统 · 演示种子数据（MySQL 8.0+）
-- 生成时间: 2026-11-07 14:34:58.664
-- 账号说明:
--   admin    / admin      管理员（内置，首次登录需强制改密）
--   zhangsan / wz123456   管理员
--   lisi     / wz123456   普通用户
--   wangwu   / wz123456   普通用户
--
-- 重复执行前请先清空:
--   SET FOREIGN_KEY_CHECKS=0;
--   TRUNCATE TABLE inbound; TRUNCATE TABLE outbound;
--   TRUNCATE TABLE receiver;
--   TRUNCATE TABLE item;
--   TRUNCATE TABLE sys_user;
--   SET FOREIGN_KEY_CHECKS=1;
-- ============================================================

-- ---------- 用户 ----------
INSERT INTO sys_user (id, username, password, realName, email, role, status, mustChangePassword, loginFailCount, lockedUntil, lastLoginAt, createdAt, updatedAt) VALUES
  (1, 'zhangsan', '$2a$10$vJIfmSCygD7PHLyvdMUGWehDAN13KerBrb7sHB9aWfRjIUvuI79GW', '张三', 'zhangsan@example.com', 'admin', 'active', 0, 0, NULL, NULL, NOW(3), NOW(3)),
  (2, 'lisi', '$2a$10$oai9Jqujy85X3oAKu8PHCeetQyM7trCayd8kGEEAmpnbXt.L3bORq', '李四', NULL, 'user', 'active', 0, 0, NULL, '2026-10-27 03:10:46.658', NOW(3), NOW(3)),
  (3, 'wangwu', '$2a$10$eb4YSMq5Tpys1WRU9ZwqIeZu3zADRJNViE1qsVATxZjdht1Y.5VMi', '王五', 'wangwu@example.com', 'user', 'active', 0, 0, NULL, NULL, NOW(3), NOW(3)),
  (4, 'admin', '$2a$10$Y1xWuAlrAcvzaykqiA6ldutZXPJxb9hz5yat39pLinUQdx.Y850qC', '系统管理员', NULL, 'admin', 'active', 0, 0, NULL, '2026-10-27 03:38:30.228', NOW(3), NOW(3));

-- ---------- 出库对象 ----------
INSERT INTO receiver (id, name, remark, status, createdAt, updatedAt) VALUES
  (1, '张三', NULL, 'active', NOW(3), NOW(3)),
  (2, '李四', NULL, 'active', NOW(3), NOW(3)),
  (3, '王五', NULL, 'active', NOW(3), NOW(3)),
  (4, '项目A施工组', NULL, 'active', NOW(3), NOW(3)),
  (5, '办公室', NULL, 'active', NOW(3), NOW(3));

-- ---------- 物资档案（结存为冗余字段，由出入库事务维护）----------
INSERT INTO item (id, name, unit, price, platform, pinyin, stock, totalInbound, totalOutbound, stockValue, lastMovedAt, status, remark, createdAt, updatedAt) VALUES
  (1, '无线鼠标', '个', 29.9, '淘宝', 'wxsb,wsm', 5, 6, 1, 149.5, '2026-10-27 02:17:40.000', 'active', NULL, NOW(3), NOW(3)),
  (2, '无线鼠标 Pro', '个', 89, '京东', 'wxsbpro,wsm,sb', 0, 0, 0, 0, NULL, 'active', NULL, NOW(3), NOW(3)),
  (3, '数据线', '条', 12.9, '拼多多', 'sjx', 4, 6, 2, 51.6, '2026-10-27 03:10:46.077', 'active', NULL, NOW(3), NOW(3)),
  (4, '手机支架', '个', 18.5, '1688', 'sjp', 6, 6, 0, 111, '2026-10-27 02:13:55.000', 'active', NULL, NOW(3), NOW(3)),
  (5, 'A4 纸', '包', 23, '京东', 'a4z', 7, 10, 3, 161, '2026-10-27 02:13:57.000', 'active', NULL, NOW(3), NOW(3)),
  (6, '签字笔', '支', 3.5, '淘宝', 'qmb,zm', 14, 20, 6, 49, '2026-10-27 02:13:57.000', 'active', NULL, NOW(3), NOW(3)),
  (7, '插线板', '个', 45, '京东', 'cxb,ch', 1, 2, 1, 45, '2026-10-27 02:13:57.000', 'active', NULL, NOW(3), NOW(3)),
  (8, '抽纸', '提', 32, '天猫', 'cz,cs', 4, 4, 0, 128, '2026-10-27 02:13:54.000', 'active', NULL, NOW(3), NOW(3)),
  (9, '垃圾袋', '卷', 9.9, '拼多多', 'ljd,lb', 5, 10, 5, 49.5, '2026-10-27 02:13:58.000', 'active', NULL, NOW(3), NOW(3)),
  (10, '文件夹', '个', 4.5, '淘宝', 'wjj,yj', 20, 20, 0, 90, '2026-10-27 02:13:55.000', 'active', NULL, NOW(3), NOW(3));

-- ---------- 入库记录 ----------
INSERT INTO inbound (id, itemId, userId, qty, orderNo, itemName, unitSnapshot, unitPrice, amount, platformSnapshot, remark, createdAt) VALUES
  (1, 1, 1, 3, '20261026T12345', '无线鼠标', '个', 29.9, 89.7, '淘宝', NULL, NOW(3)),
  (2, 3, 2, 5, 'PDD2026102609981', '数据线', '条', 12.9, 64.5, '拼多多', NULL, NOW(3)),
  (3, 6, 3, 20, 'TB20251025-44120', '签字笔', '支', 3.5, 70, '淘宝', NULL, NOW(3)),
  (4, 7, 1, 2, 'JD20251024-11883', '插线板', '个', 45, 90, '京东', NULL, NOW(3)),
  (5, 8, 1, 4, 'TM20261025-77321', '抽纸', '提', 32, 128, '天猫', NULL, NOW(3)),
  (6, 5, 1, 10, 'JD20251022-22014', 'A4 纸', '包', 23, 230, '京东', NULL, NOW(3)),
  (7, 9, 2, 10, 'PDD20251025-66203', '垃圾袋', '卷', 9.9, 99, '拼多多', NULL, NOW(3)),
  (8, 10, 2, 20, 'TB20251023-90112', '文件夹', '个', 4.5, 90, '淘宝', NULL, NOW(3)),
  (9, 4, 3, 6, '1688-20251024-3351', '手机支架', '个', 18.5, 111, '1688', NULL, NOW(3)),
  (10, 1, 1, 1, '20261020T09876', '无线鼠标', '个', 29.9, 29.9, '淘宝', NULL, NOW(3)),
  (11, 1, 4, 2, 'SMOKE-T1', '无线鼠标', '个', 29.9, 59.8, '淘宝', NULL, NOW(3)),
  (12, 3, 4, 1, 'FINAL-CHECK', '数据线', '条', 12.9, 12.9, '拼多多', NULL, NOW(3));

-- ---------- 出库记录 ----------
INSERT INTO outbound (id, itemId, userId, receiverId, qty, itemName, unitSnapshot, unitPrice, amount, receiverName, remark, createdAt) VALUES
  (1, 1, 1, 1, 1, '无线鼠标', '个', 29.9, 29.9, '张三', NULL, NOW(3)),
  (2, 6, 1, 2, 6, '签字笔', '支', 3.5, 21, '李四', NULL, NOW(3)),
  (3, 5, 2, 5, 3, 'A4 纸', '包', 23, 69, '办公室', NULL, NOW(3)),
  (4, 3, 3, 4, 2, '数据线', '条', 12.9, 25.8, '项目A施工组', NULL, NOW(3)),
  (5, 7, 1, 3, 1, '插线板', '个', 45, 45, '王五', NULL, NOW(3)),
  (6, 9, 3, 5, 5, '垃圾袋', '卷', 9.9, 49.5, '办公室', NULL, NOW(3));
