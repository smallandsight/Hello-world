-- =====================================================
-- 古月租车 - 数据库性能优化索引脚本
-- 创建日期: 2026-04-06
-- 说明: 为高频查询添加复合索引，提升API响应速度
-- =====================================================

-- 使用数据库
USE gy_bike;

-- =====================================================
-- 1. 订单表 (order) 索引优化
-- =====================================================

-- 用户订单列表查询（按状态筛选）
CREATE INDEX idx_order_user_status ON `order` (user_id, status, created_at DESC);

-- 订单时间范围查询（商家端/统计）
CREATE INDEX idx_order_created_at ON `order` (created_at DESC);

-- 订单状态查询（待处理订单）
CREATE INDEX idx_order_status ON `order` (status, created_at DESC);

-- 订单取还车时间查询
CREATE INDEX idx_order_pickup_time ON `order` (pickup_time);
CREATE INDEX idx_order_return_time ON `order` (return_time);

-- 订单号唯一索引（如果不存在）
-- CREATE UNIQUE INDEX idx_order_no ON `order` (order_no);

-- =====================================================
-- 2. 车辆表 (vehicle) 索引优化
-- =====================================================

-- 门店车辆列表查询
CREATE INDEX idx_vehicle_store_status ON vehicle (store_id, status, created_at DESC);

-- 车辆状态查询（可用车辆）
CREATE INDEX idx_vehicle_status ON vehicle (status, updated_at DESC);

-- 车型车辆查询
CREATE INDEX idx_vehicle_model ON vehicle (model_id, status);

-- =====================================================
-- 3. 支付表 (payment) 索引优化
-- =====================================================

-- 订单支付查询
CREATE INDEX idx_payment_order ON payment (order_id, created_at DESC);

-- 支付状态查询
CREATE INDEX idx_payment_status ON payment (status, created_at DESC);

-- 支付渠道查询
CREATE INDEX idx_payment_channel ON payment (channel, created_at DESC);

-- =====================================================
-- 4. 用户优惠券表 (user_coupon) 索引优化
-- =====================================================

-- 用户优惠券列表（按状态）
CREATE INDEX idx_user_coupon_user_status ON user_coupon (user_id, status, created_at DESC);

-- 优惠券模板查询
CREATE INDEX idx_user_coupon_coupon ON user_coupon (coupon_id, status);

-- 过期时间索引（定时任务）
CREATE INDEX idx_user_coupon_expire ON user_coupon (expire_at, status);

-- =====================================================
-- 5. 消息表 (message_log) 索引优化
-- =====================================================

-- 用户消息列表
CREATE INDEX idx_message_user ON message_log (user_id, is_read, created_at DESC);

-- 消息类型查询
CREATE INDEX idx_message_type ON message_log (type, created_at DESC);

-- =====================================================
-- 6. 评价表 (review) 索引优化
-- =====================================================

-- 车辆评价列表
CREATE INDEX idx_review_vehicle ON review (vehicle_id, status, created_at DESC);

-- 用户评价列表
CREATE INDEX idx_review_user ON review (user_id, created_at DESC);

-- 订单评价查询
CREATE INDEX idx_review_order ON review (order_id);

-- =====================================================
-- 7. 工单表 (ticket) 索引优化
-- =====================================================

-- 用户工单列表
CREATE INDEX idx_ticket_user ON ticket (user_id, status, created_at DESC);

-- 工单状态查询（商家端）
CREATE INDEX idx_ticket_status ON ticket (status, priority, created_at DESC);

-- 工单分类查询
CREATE INDEX idx_ticket_category ON ticket (category, status);

-- =====================================================
-- 8. 门店表 (store) 索引优化
-- =====================================================

-- 门店状态查询
CREATE INDEX idx_store_status ON store (is_active, sort_order);

-- 门店位置查询（GeoHash）
-- CREATE INDEX idx_store_geohash ON store (geohash);

-- =====================================================
-- 9. 积分记录表 (points_record) 索引优化
-- =====================================================

-- 用户积分记录
CREATE INDEX idx_points_user ON points_record (user_id, created_at DESC);

-- 积分来源查询
CREATE INDEX idx_points_source ON points_record (source, created_at DESC);

-- =====================================================
-- 10. 钱包交易表 (wallet_transaction) 索引优化
-- =====================================================

-- 用户交易记录
CREATE INDEX idx_wallet_trans_user ON wallet_transaction (user_id, created_at DESC);

-- 交易类型查询
CREATE INDEX idx_wallet_trans_type ON wallet_transaction (type, created_at DESC);

-- =====================================================
-- 11. 违章押金表 (violation_deposit) 索引优化
-- =====================================================

-- 订单违章查询
CREATE INDEX idx_violation_order ON violation_deposit (order_id);

-- 用户违章记录
CREATE INDEX idx_violation_user ON violation_deposit (user_id, status, created_at DESC);

-- =====================================================
-- 12. 续租记录表 (renewal) 索引优化
-- =====================================================

-- 订单续租查询
CREATE INDEX idx_renewal_order ON renewal (order_id);

-- 用户续租记录
CREATE INDEX idx_renewal_user ON renewal (user_id, status, created_at DESC);

-- =====================================================
-- 13. 发票表 (invoice) 索引优化
-- =====================================================

-- 用户发票列表
CREATE INDEX idx_invoice_user ON invoice (user_id, status, created_at DESC);

-- 发票状态查询
CREATE INDEX idx_invoice_status ON invoice (status, created_at DESC);

-- =====================================================
-- 14. 收藏表 (favorite) 索引优化
-- =====================================================

-- 用户收藏列表
CREATE INDEX idx_favorite_user ON favorite (user_id, created_at DESC);

-- 车辆收藏查询
CREATE INDEX idx_favorite_vehicle ON favorite (vehicle_id, user_id);

-- =====================================================
-- 15. 活动表 (activity) 索引优化
-- =====================================================

-- 活动状态查询
CREATE INDEX idx_activity_status ON activity (status, start_time, end_time);

-- 活动类型查询
CREATE INDEX idx_activity_type ON activity (type, status);

-- =====================================================
-- 分析查询优化（聚合表）
-- =====================================================

-- 日聚合表
CREATE INDEX idx_analytics_daily_date ON analytics_daily (stat_date);
CREATE INDEX idx_analytics_daily_type ON analytics_daily (stat_type, stat_date);

-- 周聚合表
CREATE INDEX idx_analytics_weekly_week ON analytics_weekly (stat_year, stat_week);
CREATE INDEX idx_analytics_weekly_type ON analytics_weekly (stat_type, stat_year, stat_week);

-- 月聚合表
CREATE INDEX idx_analytics_monthly_month ON analytics_monthly (stat_year, stat_month);
CREATE INDEX idx_analytics_monthly_type ON analytics_monthly (stat_type, stat_year, stat_month);

-- =====================================================
-- 查询索引创建结果
-- =====================================================
-- SHOW INDEX FROM `order`;
-- SHOW INDEX FROM vehicle;
-- SHOW INDEX FROM payment;
-- SHOW INDEX FROM user_coupon;
-- SHOW INDEX FROM message_log;
-- SHOW INDEX FROM review;
-- SHOW INDEX FROM ticket;
-- SHOW INDEX FROM store;

-- =====================================================
-- 性能优化说明
-- =====================================================
-- 1. 复合索引遵循最左匹配原则，查询条件应从左到右使用
-- 2. 时间字段使用 DESC 排序，适配最新数据优先的场景
-- 3. 状态字段放在索引前部，便于筛选特定状态的记录
-- 4. 避免在小数据量表上创建过多索引（如配置表）
-- 5. 定期使用 ANALYZE TABLE 更新统计信息
-- =====================================================