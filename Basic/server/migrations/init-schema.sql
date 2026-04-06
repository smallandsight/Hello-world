-- ============================================================
-- gy_bike 共享电动车租赁平台 — 完整数据库建表脚本
-- ============================================================
-- 数据库: MySQL 8.0+ (使用 InnoDB 引擎, utf8mb4 编码)
-- 字符集: utf8mb4_unicode_ci
-- 排序规则: utf8mb4_0900_ai_ci
--
-- 生成时间: 2026-04-06 18:41
-- 对应实体: 35 个 .entity.ts 文件 → ~28 张数据表
-- 总字段: ~400+
--
-- 使用方式:
--   mysql -u root -p < init-schema.sql
-- 或在 MySQL 客户端中 source /path/to/init-schema.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ============================
-- 1. 用户模块 (users)
-- ============================

CREATE TABLE IF NOT EXISTS `users` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `phone`           VARCHAR(20)     NOT NULL                COMMENT '手机号',
    `nickname`        VARCHAR(50)     DEFAULT NULL            COMMENT '昵称',
    `avatar_url`      VARCHAR(500)    DEFAULT NULL            COMMENT '头像URL',
    `gender`          TINYINT         NOT NULL DEFAULT 0       COMMENT '性别：0未知 1男 2女',
    -- 支付宝绑定
    `alipay_user_id`  VARCHAR(64)     DEFAULT NULL            COMMENT '支付宝用户ID',
    `alipay_union_id` VARCHAR(128)    DEFAULT NULL            COMMENT '支付宝UnionID',
    -- 实名认证
    `is_verified`     TINYINT         NOT NULL DEFAULT 0       COMMENT '是否实名认证：0否 1是',
    `real_name`       VARCHAR(50)     DEFAULT NULL            COMMENT '真实姓名（加密）',
    `id_card_no`      VARCHAR(100)    DEFAULT NULL            COMMENT '身份证号（加密）',
    -- 会员体系
    `level_id`        BIGINT          NOT NULL DEFAULT 1       COMMENT '会员等级ID',
    `points_balance`  BIGINT          NOT NULL DEFAULT 0       COMMENT '积分余额',
    `total_spend_cents` BIGINT        NOT NULL DEFAULT 0       COMMENT '累计消费金额(分)',
    `total_rides`     INT             NOT NULL DEFAULT 0       COMMENT '累计骑行次数',
    -- 押金
    `deposit_status`  TINYINT         NOT NULL DEFAULT 0       COMMENT '押金状态：0未缴 1已缴 2退押中 3已退',
    `deposit_amount`  BIGINT          NOT NULL DEFAULT 0       COMMENT '押金金额(分)',
    -- 状态与安全
    `status`          TINYINT         NOT NULL DEFAULT 0       COMMENT '账号状态：0正常 1禁用 2注销',
    `last_login_at`   DATETIME(3)     DEFAULT NULL            COMMENT '最后登录时间',
    `last_login_ip`   VARCHAR(45)     DEFAULT NULL            COMMENT '最后登录IP',
    -- 邀请关系
    `inviter_id`      BIGINT          DEFAULT NULL            COMMENT '邀请人ID',
    `invite_code`     VARCHAR(20)     DEFAULT NULL            COMMENT '邀请码',
    -- 基础审计字段 (BaseEntity)
    `created_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
    `deleted_at`      DATETIME(3)     DEFAULT NULL            COMMENT '删除时间（软删除）',
    `created_by`      BIGINT          DEFAULT NULL            COMMENT '创建人ID',
    `updated_by`      BIGINT          DEFAULT NULL            COMMENT '更新新人ID',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_phone` (`phone`),
    UNIQUE KEY `uk_invite_code` (`invite_code`),
    KEY `idx_alipay_user_id` (`alipay_user_id`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户表';

-- ----------------------------
-- 驾驶证表 (driver_licenses)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `driver_licenses` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`         BIGINT          NOT NULL                COMMENT '用户ID',
    `license_no`      VARCHAR(50)     DEFAULT NULL            COMMENT '驾驶证号(加密)',
    `license_class`   VARCHAR(20)     DEFAULT NULL            COMMENT '准驾车型',
    `valid_from`      DATE            DEFAULT NULL            COMMENT '有效期起始',
    `valid_to`        DATE            DEFAULT NULL            COMMENT '有效期截止',
    `front_image_url` VARCHAR(500)    DEFAULT NULL            COMMENT '驾驶证正面照URL',
    `back_image_url`  VARCHAR(500)    DEFAULT NULL            COMMENT '驾驶证反面照URL',
    `audit_status`    TINYINT         NOT NULL DEFAULT 0       COMMENT '审核状态：0待审核 1通过 2驳回',
    `auditor_id`      BIGINT          DEFAULT NULL            COMMENT '审核人ID',
    `audited_at`      DATETIME(3)     DEFAULT NULL            COMMENT '审核时间',
    `reject_reason`   VARCHAR(255)    DEFAULT NULL            COMMENT '驳回原因',
    `created_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`      DATETIME(3)     DEFAULT NULL,
    `created_by`      BIGINT          DEFAULT NULL,
    `updated_by`      BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_id` (`user_id`),
    KEY `idx_audit_status` (`audit_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='驾驶证表';

-- ----------------------------
-- 用户等级表 (user_levels)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `user_levels` (
    `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `level_name`          VARCHAR(50)     NOT NULL                COMMENT '等级名称',
    `level_code`          VARCHAR(30)     NOT NULL                COMMENT '等级标识(bronze/silver/gold/platinum)',
    `level_tier`          TINYINT         NOT NULL                COMMENT '等级级别(1=普通 2=银 3=金 4=铂金)',
    `upgrade_spend_cents` BIGINT          NOT NULL DEFAULT 0       COMMENT '升级所需消费金额(分)',
    `upgrade_rides`       INT             NOT NULL DEFAULT 0       COMMENT '升级所需骑行次数',
    `points_rate`         SMALLINT        NOT NULL DEFAULT 100     COMMENT '积分获取倍率(%)',
    `discount_rate`       SMALLINT        NOT NULL DEFAULT 100     COMMENT '折扣率(%)，100=无折扣',
    `benefits`            JSON            DEFAULT NULL            COMMENT '权益列表JSON [{name,desc}]',
    `sort_order`          INT             NOT NULL DEFAULT 0       COMMENT '排序',
    `is_active`           TINYINT         NOT NULL DEFAULT 1       COMMENT '是否启用：0否 1是',
    `created_at`          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`          DATETIME(3)     DEFAULT NULL,
    `created_by`          BIGINT          DEFAULT NULL,
    `updated_by`          BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_level_code` (`level_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户等级表';

-- 初始化默认等级数据
INSERT INTO `user_levels` (`level_name`, `level_code`, `level_tier`, `upgrade_spend_cents`, `upgrade_rides`, `points_rate`, `discount_rate`, `benefits`, `sort_order`, `is_active`) VALUES
('普通会员', 'bronze',  1, 0,      0,   100, 100, '[{"name":"基础骑行","desc":"正常价格租借"}]',                              1, 1),
('银卡会员',  'silver',  2, 200000, 10,  110, 98,  '[{"name":"95折优惠","desc":"所有订单享受95折"},{"name":"积分加成","desc":"积分获取×1.1倍"}]',   2, 1),
('金卡会员',  'gold',    3, 800000, 50,  130, 90,  '[{"name":"9折优惠","desc":"所有订单享受9折"},{"name":"积分加成","desc":"积分获取×1.3倍"}]',    3, 1),
('铂金会员',  'platinum',4, 2000000,100, 150, 85,  '[{"name":"85折优惠","desc":"所有订单享受85折"},{"name":"积分加成","desc":"积分获取×1.5倍"}]', 4, 1);

-- ============================
-- 2. 车辆模块 (vehicles)
-- ============================

-- ----------------------------
-- 门店表 (stores)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `stores` (
    `id`                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `store_name`             VARCHAR(100)    NOT NULL               COMMENT '门店名称',
    `store_code`             VARCHAR(30)     NOT NULL               COMMENT '门店编码',
    -- 地址与坐标
    `province`               VARCHAR(30)     NOT NULL               COMMENT '省份',
    `city`                   VARCHAR(30)     NOT NULL               COMMENT '城市',
    `district`               VARCHAR(30)     DEFAULT NULL           COMMENT '区县',
    `address`                VARCHAR(255)    NOT NULL               COMMENT '详细地址',
    `latitude`               DECIMAL(10,7)   NOT NULL               COMMENT '纬度',
    `longitude`              DECIMAL(11,7)   NOT NULL               COMMENT '经度',
    `geohash`                VARCHAR(12)     DEFAULT NULL           COMMENT 'GeoHash编码',
    -- 联系方式
    `phone`                  VARCHAR(20)     DEFAULT NULL           COMMENT '联系电话',
    -- 营业信息
    `open_time`              VARCHAR(10)     NOT NULL DEFAULT '08:00' COMMENT '营业时间(开始)',
    `close_time`             VARCHAR(10)     NOT NULL DEFAULT '22:00' COMMENT '营业时间(结束)',
    `service_radius_meters`  INT             NOT NULL DEFAULT 3000  COMMENT '服务半径(米)',
    -- 状态
    `is_active`              TINYINT         NOT NULL DEFAULT 1      COMMENT '是否启用：0否 1是',
    `sort_order`             INT             NOT NULL DEFAULT 0      COMMENT '排序权重',
    `created_at`             DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`             DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`             DATETIME(3)     DEFAULT NULL,
    `created_by`             BIGINT          DEFAULT NULL,
    `updated_by`             BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_store_code` (`store_code`),
    KEY `idx_geohash` (`geohash`),
    KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='门店表';

-- ----------------------------
-- 车型表 (vehicle_models)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `vehicle_models` (
    `id`                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `model_name`         VARCHAR(100)    NOT NULL               COMMENT '车型名称',
    `model_code`         VARCHAR(30)     NOT NULL               COMMENT '车型编码',
    -- 品牌与分类
    `brand`              VARCHAR(50)     NOT NULL               COMMENT '品牌',
    `vehicle_type`       ENUM('electric','motorcycle','bicycle') NOT NULL DEFAULT 'electric' COMMENT '车辆类型',
    -- 价格配置（分为单位）
    `price_per_hour_cents` BIGINT         NOT NULL               COMMENT '基础单价(分/小时)',
    `daily_cap_cents`     BIGINT         DEFAULT NULL           COMMENT '日封顶价格(分)',
    `base_price_cents`    BIGINT         NOT NULL DEFAULT 0      COMMENT '起步价(分)',
    -- 规格参数
    `features`           JSON            DEFAULT NULL           COMMENT '规格参数JSON {battery, range, maxSpeed, weight}',
    -- 展示
    `cover_image_url`    VARCHAR(500)    DEFAULT NULL           COMMENT '封面图URL',
    `description`        TEXT            DEFAULT NULL           COMMENT '车型描述',
    -- 状态
    `is_active`          TINYINT         NOT NULL DEFAULT 1      COMMENT '是否上架：0否 1是',
    `sort_order`         INT             NOT NULL DEFAULT 0      COMMENT '排序权重',
    `created_at`         DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`         DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`         DATETIME(3)     DEFAULT NULL,
    `created_by`         BIGINT          DEFAULT NULL,
    `updated_by`         BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_model_code` (`model_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='车型表';

-- ----------------------------
-- 车辆表 (vehicles)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `vehicles` (
    `id`                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `vehicle_no`              VARCHAR(30)     NOT NULL                COMMENT '车辆编号(如 GY-E001)',
    -- 关联
    `store_id`                BIGINT          NOT NULL                COMMENT '所属门店ID',
    `model_id`                BIGINT          NOT NULL                COMMENT '车型ID',
    -- 状态机
    `status`                  TINYINT         NOT NULL DEFAULT 1       COMMENT '状态：1空闲 2使用中 3维护中 4已下线 5故障',
    `battery_level`           TINYINT         DEFAULT NULL            COMMENT '电量(%)',
    -- 位置信息
    `current_lat`             DECIMAL(10,7)   DEFAULT NULL            COMMENT '当前纬度',
    `current_lng`             DECIMAL(11,7)   DEFAULT NULL            COMMENT '当前经度',
    -- 保险与年检
    `insurance_expiry_date`   DATE            DEFAULT NULL            COMMENT '保险到期日',
    `inspection_expiry_date`  DATE            DEFAULT NULL            COMMENT '年检到期日',
    -- 统计
    `total_mileage`           DECIMAL(10,2)   NOT NULL DEFAULT 0       COMMENT '累计里程(km)',
    `total_trips`             INT             NOT NULL DEFAULT 0       COMMENT '累计骑行次数',
    -- 展示
    `remark`                  VARCHAR(255)    DEFAULT NULL            COMMENT '备注',
    `is_active`               TINYINT         NOT NULL DEFAULT 1       COMMENT '是否启用',
    `created_at`              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`              DATETIME(3)     DEFAULT NULL,
    `created_by`              BIGINT          DEFAULT NULL,
    `updated_by`              BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_vehicle_no` (`vehicle_no`),
    KEY `idx_store_id` (`store_id`),
    KEY `idx_model_id` (`model_id`),
    KEY `idx_status` (`status`),
    KEY `idx_battery_level` (`battery_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='车辆表';

-- ----------------------------
-- 车辆图片表 (vehicle_images)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `vehicle_images` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `vehicle_id`  BIGINT          NOT NULL                COMMENT '车辆ID',
    `image_url`   VARCHAR(500)    NOT NULL                COMMENT '图片URL',
    `image_type`  ENUM('cover','detail','damage') NOT NULL DEFAULT 'detail' COMMENT '图片类型：cover/detail/damage',
    `sort_order`  INT             NOT NULL DEFAULT 0       COMMENT '排序',
    `created_at`  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`  DATETIME(3)     DEFAULT NULL,
    `created_by`  BIGINT          DEFAULT NULL,
    `updated_by`  BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_vehicle_id` (`vehicle_id`),
    KEY `idx_vehicle_image_type` (`vehicle_id`, `image_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='车辆图片表';

-- ----------------------------
-- 车辆维护记录表 (vehicle_maintenance)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `vehicle_maintenance` (
    `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `vehicle_id`       BIGINT          NOT NULL                COMMENT '车辆ID',
    `maintenance_type` TINYINT         NOT NULL                COMMENT '类型：1保养 2维修 3年检 4保险',
    `title`            VARCHAR(100)    NOT NULL                COMMENT '维护标题',
    `description`      TEXT            DEFAULT NULL            COMMENT '维护描述',
    `cost_cents`       BIGINT          NOT NULL DEFAULT 0       COMMENT '费用(分)',
    -- 时间
    `planned_start_at` DATETIME(3)     DEFAULT NULL            COMMENT '计划开始时间',
    `actual_start_at`  DATETIME(3)     DEFAULT NULL            COMMENT '实际开始时间',
    `completed_at`     DATETIME(3)     DEFAULT NULL            COMMENT '完成时间',
    -- 状态
    `status`           TINYINT         NOT NULL DEFAULT 0       COMMENT '状态：0待处理 1进行中 2已完成 3已取消',
    `handler_id`       BIGINT          DEFAULT NULL            COMMENT '处理人ID',
    `created_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`       DATETIME(3)     DEFAULT NULL,
    `created_by`       BIGINT          DEFAULT NULL,
    `updated_by`       BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_vehicle_id` (`vehicle_id`),
    KEY `idx_maintenance_type` (`maintenance_type`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='车辆维护记录表';

-- ============================
-- 3. 订单模块 (orders)
-- ============================

CREATE TABLE IF NOT EXISTS `orders` (
    `id`                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    -- 订单编号
    `order_no`                 VARCHAR(30)     NOT NULL                COMMENT '订单编号(如 GY20260405001)',
    -- 关联主体
    `user_id`                  BIGINT          NOT NULL                COMMENT '用户ID',
    `vehicle_id`               BIGINT          NOT NULL                COMMENT '车辆ID',
    `store_id`                 BIGINT          NOT NULL                COMMENT '门店ID',
    -- 状态机 (10-80)
    `status`                   TINYINT         NOT NULL DEFAULT 10      COMMENT '订单状态：10待支付 20待取车 30使用中 40待还车 50待结算 60已完成 70已取消 80异常',
    -- 时间节点
    `ordered_at`               DATETIME(3)     DEFAULT NULL            COMMENT '下单时间',
    `paid_at`                  DATETIME(3)     DEFAULT NULL            COMMENT '支付时间',
    `picked_up_at`             DATETIME(3)     DEFAULT NULL            COMMENT '取车时间',
    `return_requested_at`      DATETIME(3)     DEFAULT NULL            COMMENT '发起还车时间',
    `returned_at`              DATETIME(3)     DEFAULT NULL            COMMENT '还车确认时间',
    `settled_at`              DATETIME(3)     DEFAULT NULL            COMMENT '结算完成时间',
    `cancelled_at`             DATETIME(3)     DEFAULT NULL            COMMENT '取消时间',
    -- 地点信息（冗余）
    `pickup_address`           VARCHAR(255)    DEFAULT NULL            COMMENT '取车地址(冗余)',
    `pickup_lat`               DECIMAL(10,7)   DEFAULT NULL            COMMENT '取车纬度',
    `pickup_lng`               DECIMAL(11,7)   DEFAULT NULL            COMMENT '取车经度',
    `return_location_desc`     VARCHAR(255)    DEFAULT NULL            COMMENT '还车位置描述',
    `return_lat`               DECIMAL(10,7)   DEFAULT NULL            COMMENT '还车纬度',
    `return_lng`               DECIMAL(11,7)   DEFAULT NULL            COMMENT '还车经度',
    -- 费用明细（分为单位，全部冗余）
    `base_fare_cents`          BIGINT          NOT NULL DEFAULT 0       COMMENT '基础骑行费(分)',
    `time_surcharge_cents`     BIGINT          NOT NULL DEFAULT 0       COMMENT '时段附加费(分)',
    `distance_fare_cents`      BIGINT          NOT NULL DEFAULT 0       COMMENT '里程费(分)',
    `member_discount_cents`    BIGINT          NOT NULL DEFAULT 0       COMMENT '会员折扣减免(分)',
    `coupon_discount_cents`    BIGINT          NOT NULL DEFAULT 0       COMMENT '优惠券抵扣(分)',
    `points_discount_cents`    BIGINT          NOT NULL DEFAULT 0       COMMENT '积分抵扣(分)',
    `other_discount_cents`     BIGINT          NOT NULL DEFAULT 0       COMMENT '其他优惠(分)',
    -- 总金额
    `original_amount_cents`    BIGINT          NOT NULL DEFAULT 0       COMMENT '订单原价(分)',
    `payable_amount_cents`     BIGINT          NOT NULL DEFAULT 0       COMMENT '应付金额(分)',
    `paid_amount_cents`        BIGINT          NOT NULL DEFAULT 0       COMMENT '实付金额(分)',
    -- 骑行数据
    `duration_seconds`         INT             NOT NULL DEFAULT 0       COMMENT '骑行时长(秒)',
    `distance_meters`          INT             NOT NULL DEFAULT 0       COMMENT '骑行距离(米)',
    -- 优惠关联
    `user_coupon_id`           BIGINT          DEFAULT NULL            COMMENT '使用的优惠券ID',
    `points_used`              INT             NOT NULL DEFAULT 0       COMMENT '使用积分',
    -- 取消/异常
    `cancel_reason`            VARCHAR(255)    DEFAULT NULL            COMMENT '取消原因',
    `abnormal_type`            VARCHAR(50)     DEFAULT NULL            COMMENT '异常类型',
    `abnormal_remark`          TEXT            DEFAULT NULL            COMMENT '异常备注',
    -- 基础审计
    `created_at`               DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`               DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`               DATETIME(3)     DEFAULT NULL,
    `created_by`               BIGINT          DEFAULT NULL,
    `updated_by`               BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_order_no` (`order_no`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_vehicle_id` (`vehicle_id`),
    KEY `idx_store_id` (`store_id`),
    KEY `idx_status` (`status`),
    KEY `idx_created_at` (`created_at`),
    KEY `idx_ordered_at` (`ordered_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='订单表';

-- ----------------------------
-- 订单操作日志表 (order_logs)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `order_logs` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id`      BIGINT          NOT NULL                COMMENT '订单ID',
    `action`        VARCHAR(30)     NOT NULL                COMMENT '操作类型(status_change/payment/pickup/return/cancel/settle/refund)',
    `from_status`   TINYINT         DEFAULT NULL            COMMENT '变更前状态',
    `to_status`     TINYINT         DEFAULT NULL            COMMENT '变更后状态',
    -- 操作者
    `operator_type` ENUM('user','system','staff') NOT NULL DEFAULT 'user' COMMENT '操作者类型',
    `operator_id`   BIGINT          DEFAULT NULL            COMMENT '操作者ID',
    -- 变更内容
    `change_content` JSON           DEFAULT NULL            COMMENT '变更内容JSON',
    `remark`        TEXT            DEFAULT NULL            COMMENT '备注',
    `created_at`    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`    DATETIME(3)     DEFAULT NULL,
    `created_by`    BIGINT          DEFAULT NULL,
    `updated_by`    BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_order_id` (`order_id`),
    KEY `idx_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='订单操作日志表';

-- ============================
-- 4. 支付模块 (payments/preauths/refunds)
-- ============================

-- ----------------------------
-- 支付记录表 (payments)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `payments` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `payment_no`      VARCHAR(64)     NOT NULL                COMMENT '支付流水号',
    `order_id`        BIGINT          NOT NULL                COMMENT '订单ID',
    -- 支付方式与金额
    `pay_channel`     ENUM('alipay','wechat','balance','points') NOT NULL COMMENT '支付渠道',
    `pay_type`        ENUM('deposit','payment','preauth') NOT NULL DEFAULT 'payment' COMMENT '支付类型',
    `amount_cents`    BIGINT          NOT NULL                COMMENT '支付金额(分)',
    `currency`        VARCHAR(10)     NOT NULL DEFAULT 'CNY'   COMMENT '货币单位',
    -- 状态
    `status`          TINYINT         NOT NULL DEFAULT 0       COMMENT '状态：0待支付 1支付中 2已支付 3已退款 4已关闭 5失败',
    -- 第三方信息
    `trade_no`        VARCHAR(128)    DEFAULT NULL            COMMENT '第三方交易号',
    `callback_data`   JSON            DEFAULT NULL            COMMENT '回调数据JSON',
    -- 时间
    `expire_at`       DATETIME(3)     DEFAULT NULL            COMMENT '支付超时时间',
    `paid_at`         DATETIME(3)     DEFAULT NULL            COMMENT '实际支付时间',
    `created_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`      DATETIME(3)     DEFAULT NULL,
    `created_by`      BIGINT          DEFAULT NULL,
    `updated_by`      BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_payment_no` (`payment_no`),
    KEY `idx_order_id` (`order_id`),
    KEY `idx_pay_channel` (`pay_channel`),
    KEY `idx_status` (`status`),
    KEY `idx_trade_no` (`trade_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='支付记录表';

-- ----------------------------
-- 预授权记录表 (preauths)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `preauths` (
    `id`                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `preauth_no`           VARCHAR(64)     NOT NULL                COMMENT '预授权流水号',
    `user_id`              BIGINT          NOT NULL                COMMENT '用户ID',
    `order_id`             BIGINT          DEFAULT NULL            COMMENT '订单ID',
    -- 金额（分为单位）
    `freeze_amount_cents`  BIGINT          NOT NULL                COMMENT '冻结金额(分)',
    `deducted_amount_cents` BIGINT        NOT NULL DEFAULT 0       COMMENT '已扣款(分)',
    `released_amount_cents` BIGINT        NOT NULL DEFAULT 0       COMMENT '已解冻金额(分)',
    `remaining_amount_cents` BIGINT       NOT NULL DEFAULT 0       COMMENT '剩余冻结金额(分)',
    -- 状态
    `status`               TINYINT         NOT NULL DEFAULT 0       COMMENT '状态：0待确认 1已冻结 2部分扣款 3已解冻 4已关闭',
    -- 第三方信息
    `agreement_no`         VARCHAR(128)    DEFAULT NULL            COMMENT '支付宝预授权协议号',
    `preauth_trade_no`     VARCHAR(128)    DEFAULT NULL            COMMENT '预授权交易号',
    -- 时间
    `frozen_at`            DATETIME(3)     DEFAULT NULL            COMMENT '冻结时间',
    `released_at`          DATETIME(3)     DEFAULT NULL            COMMENT '解冻完成时间',
    `created_at`           DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`           DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`           DATETIME(3)     DEFAULT NULL,
    `created_by`           BIGINT          DEFAULT NULL,
    `updated_by`           BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_preauth_no` (`preauth_no`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_order_id` (`order_id`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='预授权记录表';

-- ----------------------------
-- 退款记录表 (refunds)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `refunds` (
    `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `refund_no`         VARCHAR(64)     NOT NULL                COMMENT '退款流水号',
    `payment_id`        BIGINT          NOT NULL                COMMENT '支付记录ID',
    `order_id`          BIGINT          DEFAULT NULL            COMMENT '订单ID',
    `user_id`           BIGINT          NOT NULL                COMMENT '用户ID',
    -- 金额
    `refund_amount_cents` BIGINT        NOT NULL                COMMENT '退款金额(分)',
    `original_amount_cents` BIGINT      DEFAULT NULL            COMMENT '原支付金额(分)',
    `refund_ratio`      TINYINT         DEFAULT NULL            COMMENT '退回比例(整数百分比)',
    -- 类型与审核
    `refund_type`       ENUM('order','deposit','preauth') NOT NULL DEFAULT 'order' COMMENT '退款类型',
    `audit_status`      TINYINT         NOT NULL DEFAULT 0       COMMENT '审核状态：0待审核 1通过 2驳回 3取消',
    `auditor_id`        BIGINT          DEFAULT NULL            COMMENT '审核人ID',
    `reject_reason`     VARCHAR(255)    DEFAULT NULL            COMMENT '驳回原因',
    -- 第三方信息
    `reason`            VARCHAR(255)    DEFAULT NULL            COMMENT '退款原因(传给第三方)',
    `refund_trade_no`   VARCHAR(128)    DEFAULT NULL            COMMENT '第三方退款单号',
    -- 状态
    `status`            TINYINT         NOT NULL DEFAULT 0       COMMENT '状态：0处理中 1成功 2失败 3已关闭',
    -- 时间
    `applied_at`        DATETIME(3)     DEFAULT NULL            COMMENT '申请时间',
    `completed_at`      DATETIME(3)     DEFAULT NULL            COMMENT '完成到账时间',
    `created_at`        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`        DATETIME(3)     DEFAULT NULL,
    `created_by`        BIGINT          DEFAULT NULL,
    `updated_by`        BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_refund_no` (`refund_no`),
    KEY `idx_payment_id` (`payment_id`),
    KEY `idx_order_id` (`order_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_refund_trade_no` (`refund_trade_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='退款记录表';

-- ============================
-- 5. 优惠券模块 (coupons/user_coupons/points_records)
-- ============================

-- ----------------------------
-- 优惠券模板表 (coupons)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `coupons` (
    `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `coupon_name`           VARCHAR(100)    NOT NULL               COMMENT '优惠券名称',
    `coupon_code`           VARCHAR(30)     NOT NULL               COMMENT '优惠券编码(唯一标识)',
    -- 优惠规则
    `discount_type`         ENUM('fixed','percent') NOT NULL       COMMENT '优惠类型：fixed固定金额 percent折扣',
    `discount_value`        BIGINT          NOT NULL               COMMENT '优惠值(分或%)',
    `min_order_amount_cents` BIGINT         NOT NULL DEFAULT 0      COMMENT '使用门槛(分)，0=无门槛',
    `max_discount_cents`    BIGINT          DEFAULT NULL           COMMENT '最大抵扣(分)，仅percent有效',
    -- 适用范围
    `scope_type`            ENUM('all','vehicle_type','store') NOT NULL DEFAULT 'all' COMMENT '适用范围',
    `scope_values`          JSON            DEFAULT NULL           COMMENT '适用范围值JSON [ids]',
    -- 发放与有效期
    `total_count`           INT             NOT NULL DEFAULT 0      COMMENT '总发放量(0不限)',
    `per_user_limit`        SMALLINT        NOT NULL DEFAULT 1      COMMENT '每人限领数',
    `issued_count`          INT             NOT NULL DEFAULT 0      COMMENT '已发放数量',
    `valid_type`            ENUM('fixed','relative') NOT NULL DEFAULT 'relative' COMMENT '有效期类型',
    `valid_start_at`        DATETIME(3)     DEFAULT NULL           COMMENT '有效起始时间(fixed模式)',
    `valid_end_at`          DATETIME(3)     DEFAULT NULL           COMMENT '有效截止时间(fixed模式)',
    `valid_days`            SMALLINT        DEFAULT NULL           COMMENT '有效天数(relative模式)',
    -- 展示
    `description`           TEXT            DEFAULT NULL           COMMENT '描述/说明',
    `is_active`             TINYINT         NOT NULL DEFAULT 1      COMMENT '是否启用',
    `created_at`            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`            DATETIME(3)     DEFAULT NULL,
    `created_by`            BIGINT          DEFAULT NULL,
    `updated_by`            BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_coupon_code` (`coupon_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='优惠券模板表';

-- ----------------------------
-- 用户优惠券表 (user_coupons)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `user_coupons` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`       BIGINT          NOT NULL                COMMENT '用户ID',
    `coupon_id`     BIGINT          NOT NULL                COMMENT '优惠券模板ID',
    -- 状态与时间
    `status`        TINYINT         NOT NULL DEFAULT 0       COMMENT '状态：0未使用 1已使用 2已过期',
    `received_at`   DATETIME(3)     DEFAULT NULL            COMMENT '领取时间',
    `used_at`       DATETIME(3)     DEFAULT NULL            COMMENT '使用时间',
    `valid_from`    DATETIME(3)     DEFAULT NULL            COMMENT '有效起始',
    `valid_to`      DATETIME(3)     DEFAULT NULL            COMMENT '有效截止',
    -- 使用记录
    `order_id`      BIGINT          DEFAULT NULL            COMMENT '使用的订单ID',
    -- 来源追踪
    `source`        ENUM('manual','task','invite','activity') NOT NULL DEFAULT 'manual' COMMENT '来源',
    `source_id`     BIGINT          DEFAULT NULL            COMMENT '来源关联ID',
    `created_at`    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`    DATETIME(3)     DEFAULT NULL,
    `created_by`    BIGINT          DEFAULT NULL,
    `updated_by`    BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_coupon_id` (`coupon_id`),
    KEY `idx_status_valid` (`user_id`, `status`, `valid_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户优惠券表';

-- ----------------------------
-- 积分记录表 (points_records)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `points_records` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`       BIGINT          NOT NULL                COMMENT '用户ID',
    -- 变动信息
    `change_type`   ENUM('earn','spend','expire','refund','adjust') NOT NULL COMMENT '变动类型',
    `points_change` INT             NOT NULL                COMMENT '变动积分(正增负减)',
    `balance_after` INT             NOT NULL                COMMENT '变动后余额',
    -- 关联
    `order_id`      BIGINT          DEFAULT NULL            COMMENT '关联订单ID',
    -- 描述
    `description`   VARCHAR(255)    DEFAULT NULL            COMMENT '变动描述',
    `remark`        VARCHAR(255)    DEFAULT NULL            COMMENT '备注',
    `created_at`    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`    DATETIME(3)     DEFAULT NULL,
    `created_by`    BIGINT          DEFAULT NULL,
    `updated_by`    BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_order_id` (`order_id`),
    KEY `idx_change_type` (`change_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='积分记录表';

-- ============================
-- 6. 消息模块 (message_log)
-- ============================

CREATE TABLE IF NOT EXISTS `message_log` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`       BIGINT          NOT NULL                COMMENT '用户ID(目标接收人)',
    -- 消息内容
    `message_type`  ENUM('order_status','system','marketing','coupon') NOT NULL COMMENT '消息类型',
    `title`         VARCHAR(200)    NOT NULL                COMMENT '消息标题',
    `content`       TEXT            DEFAULT NULL            COMMENT '消息正文',
    -- 推送渠道
    `channel`       ENUM('push','sms','in_app') NOT NULL DEFAULT 'in_app' COMMENT '推送渠道',
    `biz_id`        BIGINT          DEFAULT NULL            COMMENT '关联业务ID',
    `template_id`   VARCHAR(100)    DEFAULT NULL            COMMENT '消息模板ID',
    -- 状态与时间
    `is_read`       TINYINT         NOT NULL DEFAULT 0       COMMENT '是否已读：0未读 1已读',
    `read_at`       DATETIME(3)     DEFAULT NULL            COMMENT '阅读时间',
    `sent_at`       DATETIME(3)     DEFAULT NULL            COMMENT '发送时间',
    `send_status`   ENUM('pending','success','failed') NOT NULL DEFAULT 'pending' COMMENT '发送结果',
    `fail_reason`   VARCHAR(255)    DEFAULT NULL            COMMENT '失败原因',
    `created_at`    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`    DATETIME(3)     DEFAULT NULL,
    `created_by`    BIGINT          DEFAULT NULL,
    `updated_by`    BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_message_type` (`message_type`),
    KEY `idx_send_status` (`send_status`),
    KEY `idx_is_read` (`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='消息日志表';

-- ============================
-- 7. 员工权限模块 (staff/roles/permissions/staff_roles/role_permissions)
-- ============================

-- ----------------------------
-- 权限表 (permissions)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `permissions` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `permission_name` VARCHAR(100)    NOT NULL               COMMENT '权限名称',
    `permission_code` VARCHAR(100)    NOT NULL               COMMENT '权限码(如 order:view)',
    `resource_type`   VARCHAR(30)     NOT NULL               COMMENT '资源类型/模块',
    `permission_type` ENUM('menu','button','api') NOT NULL DEFAULT 'api' COMMENT '类型：menu/button/api',
    -- 层级关系
    `parent_id`       BIGINT          NOT NULL DEFAULT 0      COMMENT '父级ID(0=顶级)',
    `sort_order`      INT             NOT NULL DEFAULT 0       COMMENT '排序',
    `path`            VARCHAR(200)    DEFAULT NULL            COMMENT '路由路径(menu类型)',
    `icon`            VARCHAR(50)     DEFAULT NULL            COMMENT '图标',
    -- 状态
    `is_active`       TINYINT         NOT NULL DEFAULT 1       COMMENT '是否启用',
    `created_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`      DATETIME(3)     DEFAULT NULL,
    `created_by`      BIGINT          DEFAULT NULL,
    `updated_by`      BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_permission_code` (`permission_code`),
    KEY `idx_parent_id` (`parent_id`),
    KEY `idx_resource_type` (`resource_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='权限表';

-- ----------------------------
-- 角色表 (roles)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `roles` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `role_name`     VARCHAR(50)     NOT NULL                COMMENT '角色名称',
    `role_code`     VARCHAR(30)     NOT NULL                COMMENT '角色编码(如 admin/operator/cashier)',
    `description`   VARCHAR(255)    DEFAULT NULL            COMMENT '角色描述',
    `data_scope`    ENUM('all','self','store','custom') NOT NULL DEFAULT 'store' COMMENT '数据权限范围',
    `is_builtin`    TINYINT         NOT NULL DEFAULT 0       COMMENT '系统内置：0否 1是',
    `sort_order`    INT             NOT NULL DEFAULT 0       COMMENT '排序',
    `is_active`     TINYINT         NOT NULL DEFAULT 1       COMMENT '是否启用',
    `created_at`    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`    DATETIME(3)     DEFAULT NULL,
    `created_by`    BIGINT          DEFAULT NULL,
    `updated_by`    BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_role_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色表';

-- 初始化默认角色
INSERT INTO `roles` (`role_name`, `role_code`, `description`, `data_scope`, `is_builtin`, `sort_order`, `is_active`) VALUES
('超级管理员', 'admin',   '拥有所有权限的超级管理员角色', 'all',    1, 1, 1),
('运营人员',   'operator','负责日常运营管理',               'store',  0, 2, 1),
('财务人员',   'cashier', '负责财务管理与对账',               'store',  0, 3, 1);

-- ----------------------------
-- 员工表 (staff)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `staff` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    -- 账号信息
    `staff_no`        VARCHAR(30)     NOT NULL                COMMENT '工号',
    `account`         VARCHAR(100)    NOT NULL                COMMENT '登录账号(手机号/邮箱)',
    `password_hash`   VARCHAR(255)    NOT NULL                COMMENT '密码哈希(bcrypt)',
    -- 基本信息
    `real_name`       VARCHAR(50)     NOT NULL                COMMENT '真实姓名',
    `phone`           VARCHAR(20)     DEFAULT NULL            COMMENT '手机号',
    `avatar_url`      VARCHAR(500)    DEFAULT NULL            COMMENT '头像URL',
    -- 所属门店
    `store_id`        BIGINT          DEFAULT NULL            COMMENT '所属门店ID',
    -- 状态与安全
    `status`          TINYINT         NOT NULL DEFAULT 0       COMMENT '状态：0正常 1禁用 2锁定',
    -- 登录统计
    `last_login_at`   DATETIME(3)     DEFAULT NULL            COMMENT '最后登录时间',
    `last_login_ip`   VARCHAR(45)     DEFAULT NULL            COMMENT '最后登录IP',
    `login_count`     INT             NOT NULL DEFAULT 0       COMMENT '累计登录次数',
    `created_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`      DATETIME(3)     DEFAULT NULL,
    `created_by`      BIGINT          DEFAULT NULL,
    `updated_by`      BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_staff_no` (`staff_no`),
    UNIQUE KEY `uk_account` (`account`),
    KEY `idx_store_id` (`store_id`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='员工表';

-- ----------------------------
-- 员工-角色关联表 (staff_roles)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `staff_roles` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `staff_id`    BIGINT          NOT NULL                COMMENT '员工ID',
    `role_id`     BIGINT          NOT NULL                COMMENT '角色ID',
    `assigner_id` BIGINT          DEFAULT NULL            COMMENT '分配人ID',
    `created_at`  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`  DATETIME(3)     DEFAULT NULL,
    `created_by`  BIGINT          DEFAULT NULL,
    `updated_by`  BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_staff_id` (`staff_id`),
    KEY `idx_role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='员工-角色关联表';

-- ----------------------------
-- 角色-权限关联表 (role_permissions)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `role_permissions` (
    `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `role_id`      BIGINT          NOT NULL                COMMENT '角色ID',
    `permission_id` BIGINT         NOT NULL                COMMENT '权限ID',
    `creator_id`   BIGINT          DEFAULT NULL            COMMENT '授权人ID',
    `created_at`   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`   DATETIME(3)     DEFAULT NULL,
    `created_by`   BIGINT          DEFAULT NULL,
    `updated_by`   BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_role_id` (`role_id`),
    KEY `idx_permission_id` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色-权限关联表';

-- ============================
-- 8. 第三阶段新增模块
-- ============================

-- ----------------------------
-- 违章押金表 (violation_deposit) — T3W10-1
-- ----------------------------
CREATE TABLE IF NOT EXISTS `violation_deposit` (
    `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id`              INT             NOT NULL                COMMENT '关联订单ID',
    `user_id`               INT             NOT NULL                COMMENT '用户ID',
    `vehicle_id`            INT             DEFAULT NULL            COMMENT '车辆ID',
    `amount_cents`          BIGINT          NOT NULL DEFAULT 0       COMMENT '冻结金额(分)',
    `status`                ENUM('FROZEN','DEDUCTED','REFUNDED','PARTIAL_REFUND') NOT NULL DEFAULT 'FROZEN' COMMENT '状态',
    `frozen_transaction_id` VARCHAR(64)     DEFAULT NULL            COMMENT '冻结交易流水号',
    `deduction_amount`      BIGINT          DEFAULT NULL            COMMENT '实际扣除金额(分)',
    `refund_amount`         BIGINT          DEFAULT NULL            COMMENT '退还金额(分)',
    `violation_detail`      JSON            DEFAULT NULL            COMMENT '违章详情JSON',
    `deducted_at`           DATETIME(3)     DEFAULT NULL            COMMENT '扣除时间',
    `refunded_at`           DATETIME(3)     DEFAULT NULL            COMMENT '退还时间',
    `observation_end_at`    DATETIME(3)     DEFAULT NULL            COMMENT '观察期截止时间',
    `remark`                TEXT            DEFAULT NULL            COMMENT '备注',
    `created_at`            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`            DATETIME(3)     DEFAULT NULL,
    `created_by`            BIGINT          DEFAULT NULL,
    `updated_by`            BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_order_id` (`order_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='违章押金表';

-- ----------------------------
-- 发票抬头表 (invoice_title) — T3W10-2
-- ----------------------------
CREATE TABLE IF NOT EXISTS `invoice_title` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`       INT             NOT NULL                COMMENT '用户ID',
    `title_name`    VARCHAR(200)    NOT NULL                COMMENT '抬头名称',
    `tax_no`        VARCHAR(50)     DEFAULT NULL            COMMENT '税号/身份证号',
    `type`          ENUM('PERSONAL','COMPANY') NOT NULL DEFAULT 'PERSONAL' COMMENT '类型: 个人/企业',
    `address`       VARCHAR(255)    DEFAULT NULL            COMMENT '地址',
    `phone`         VARCHAR(30)     DEFAULT NULL            COMMENT '电话',
    `email`         VARCHAR(100)    DEFAULT NULL            COMMENT '邮箱(电子发票)',
    `bank_name`      VARCHAR(100)    DEFAULT NULL            COMMENT '开户银行',
    `bank_account`  VARCHAR(50)     DEFAULT NULL            COMMENT '银行账号',
    `is_default`    TINYINT         NOT NULL DEFAULT 0       COMMENT '是否默认抬头',
    `created_at`    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`    DATETIME(3)     DEFAULT NULL,
    `created_by`    BIGINT          DEFAULT NULL,
    `updated_by`    BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='发票抬头表';

-- ----------------------------
-- 发票记录表 (invoice) — T3W10-2
-- ----------------------------
CREATE TABLE IF NOT EXISTS `invoice` (
    `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`           INT             NOT NULL                COMMENT '用户ID',
    `order_id`          INT             NOT NULL                COMMENT '关联订单',
    `title_id`          INT             NOT NULL                COMMENT '发票抬头ID',
    `invoice_type`      ENUM('ELECTRONIC_NORMAL','PAPER_NORMAL','ELECTRONIC_SPECIAL','PAPER_SPECIAL') NOT NULL DEFAULT 'ELECTRONIC_NORMAL' COMMENT '发票类型',
    `amount_cents`      BIGINT          NOT NULL                COMMENT '发票金额(分)',
    `status`            ENUM('PENDING','ISSUED','DELIVERED','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING' COMMENT '状态',
    `invoice_no`        VARCHAR(50)     DEFAULT NULL            COMMENT '发票号码',
    `issued_at`         DATETIME        DEFAULT NULL            COMMENT '开票时间',
    `mail_tracking_no`  VARCHAR(100)    DEFAULT NULL            COMMENT '邮寄跟踪号',
    `fail_reason`       TEXT            DEFAULT NULL            COMMENT '失败原因',
    `created_at`        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`        DATETIME(3)     DEFAULT NULL,
    `created_by`        BIGINT          DEFAULT NULL,
    `updated_by`        BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_order_id` (`order_id`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='发票记录表';

-- ----------------------------
-- 钱包表 (wallet) — T3W10-4
-- ----------------------------
CREATE TABLE IF NOT EXISTS `wallet` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`         INT             NOT NULL UNIQUE          COMMENT '用户ID',
    `balance_cents`   BIGINT          NOT NULL DEFAULT 0       COMMENT '余额(分)',
    `frozen_amount`   BIGINT          NOT NULL DEFAULT 0       COMMENT '冻结金额(分)',
    `version`         INT             NOT NULL DEFAULT 1       COMMENT '版本号(乐观锁)',
    `created_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`      DATETIME(3)     DEFAULT NULL,
    `created_by`      BIGINT          DEFAULT NULL,
    `updated_by`      BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='钱包表';

-- ----------------------------
-- 钱包交易流水表 (wallet_transaction) — T3W10-4
-- ----------------------------
CREATE TABLE IF NOT EXISTS `wallet_transaction` (
    `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_id`         INT             NOT NULL                COMMENT '钱包ID',
    `user_id`           INT             NOT NULL                COMMENT '用户ID',
    `type`              ENUM('RECHARGE','PAY','REFUND','DEDUCTION','REBATE') NOT NULL COMMENT '交易类型',
    `amount_cents`      BIGINT          NOT NULL                COMMENT '变动金额(分),正增负减',
    `balance_after_cents` BIGINT        NOT NULL                COMMENT '变动后余额(分)',
    `order_id`          INT             DEFAULT NULL            COMMENT '关联订单ID',
    `remark`            TEXT            DEFAULT NULL            COMMENT '备注',
    `created_at`        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`        DATETIME(3)     DEFAULT NULL,
    `created_by`        BIGINT          DEFAULT NULL,
    `updated_by`        BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_wallet_id` (`wallet_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_type` (`type`),
    KEY `idx_order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='钱包交易流水表';

-- ----------------------------
-- 续租申请表 (order_renewal) — T3W10-5
-- ----------------------------
CREATE TABLE IF NOT EXISTS `order_renewal` (
    `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id`            INT             NOT NULL                COMMENT '关联订单ID',
    `original_return_time` DATETIME       NOT NULL                COMMENT '原计划还车时间',
    `requested_days`      INT             NOT NULL                COMMENT '申请延长(天)',
    `extra_fare_cents`    BIGINT          NOT NULL DEFAULT 0       COMMENT '额外费用(分)',
    `status`              ENUM('PENDING','APPROVED','REJECTED','PAID','CANCELLED') NOT NULL DEFAULT 'PENDING' COMMENT '状态',
    `approve_remark`      TEXT            DEFAULT NULL            COMMENT '审批备注',
    `approved_by`         INT             DEFAULT NULL            COMMENT '审批人ID',
    `approved_at`         DATETIME(3)     DEFAULT NULL            COMMENT '审批时间',
    `paid_at`             DATETIME(3)     DEFAULT NULL            COMMENT '支付时间',
    `created_at`          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`          DATETIME(3)     DEFAULT NULL,
    `created_by`          BIGINT          DEFAULT NULL,
    `updated_by`          BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_order_id` (`order_id`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='续租申请表';

-- ----------------------------
-- 评价表 (reviews) — T3W11-1
-- ----------------------------
CREATE TABLE IF NOT EXISTS `reviews` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`         BIGINT          NOT NULL                COMMENT '评价用户ID',
    `order_id`        BIGINT          NOT NULL                COMMENT '关联订单ID(唯一)',
    `vehicle_id`      BIGINT          NOT NULL                COMMENT '被评价车辆ID',
    -- 评分与内容
    `rating`          TINYINT         NOT NULL                COMMENT '综合评分(1-5)',
    `content`         TEXT            DEFAULT NULL            COMMENT '评价内容',
    `images`          JSON            DEFAULT NULL            COMMENT '图片列表JSON [urls]',
    `tags`            JSON            DEFAULT NULL            COMMENT '标签JSON ["tag1","tag2"]',
    -- 商家回复
    `reply_content`   TEXT            DEFAULT NULL            COMMENT '商家回复内容',
    `replied_at`      DATETIME(3)     DEFAULT NULL            COMMENT '商家回复时间',
    -- 审核
    `status`          ENUM('PENDING','APPROVED','REJECTED','HIDDEN') NOT NULL DEFAULT 'PENDING' COMMENT '审核状态',
    `audit_result`    VARCHAR(255)    DEFAULT NULL            COMMENT '审核结果说明',
    `created_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`      DATETIME(3)     DEFAULT NULL,
    `created_by`      BIGINT          DEFAULT NULL,
    `updated_by`      BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_order_id` (`order_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_vehicle_id` (`vehicle_id`),
    KEY `idx_rating` (`rating`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='评价表';

-- ----------------------------
-- 收藏表 (favorites) — T3W11-2
-- ----------------------------
CREATE TABLE IF NOT EXISTS `favorites` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`     BIGINT          NOT NULL                COMMENT '用户ID',
    `vehicle_id`  BIGINT          NOT NULL                COMMENT '被收藏的车辆ID',
    `created_at`  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '收藏时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_vehicle` (`user_id`, `vehicle_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_vehicle_id` (`vehicle_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='收藏表';

-- ----------------------------
-- 反馈表 (feedbacks) — T3W11-3
-- ----------------------------
CREATE TABLE IF NOT EXISTS `feedbacks` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`       BIGINT          NOT NULL                COMMENT '提交用户ID',
    -- 分类与内容
    `category`      ENUM('FEATURE_SUGGESTION','BUG_REPORT','COMPLAINT','OTHER') NOT NULL COMMENT '反馈分类',
    `content`       TEXT            NOT NULL                COMMENT '反馈内容',
    `images`        JSON            DEFAULT NULL            COMMENT '图片列表JSON [urls]',
    -- 联系方式
    `contact_phone` VARCHAR(20)     DEFAULT NULL            COMMENT '联系手机号',
    `contact_email` VARCHAR(100)    DEFAULT NULL            COMMENT '联系邮箱',
    -- 处理状态
    `status`        ENUM('PENDING','PROCESSING','RESOLVED','CLOSED') NOT NULL DEFAULT 'PENDING' COMMENT '处理状态',
    `staff_reply`   TEXT            DEFAULT NULL            COMMENT '客服回复',
    `replied_at`    DATETIME(3)     DEFAULT NULL            COMMENT '回复时间',
    `created_at`    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`    DATETIME(3)     DEFAULT NULL,
    `created_by`    BIGINT          DEFAULT NULL,
    `updated_by`    BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_category` (`category`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='反馈表';

-- ----------------------------
-- 工单表 (tickets) — T3W13-1~3
-- ----------------------------
CREATE TABLE IF NOT EXISTS `tickets` (
    `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`             BIGINT          NOT NULL                COMMENT '用户ID',
    -- 工单信息
    `ticket_no`           VARCHAR(30)     NOT NULL                COMMENT '工单编号',
    `ticket_type`         ENUM('complaint','problem','accident','other') NOT NULL DEFAULT 'problem' COMMENT '工单类型',
    `title`               VARCHAR(200)    NOT NULL                COMMENT '工单标题',
    `content`             TEXT            NOT NULL                COMMENT '内容描述',
    `order_id`            BIGINT          DEFAULT NULL            COMMENT '关联订单ID',
    -- 状态与优先级
    `status`              TINYINT         NOT NULL DEFAULT 0       COMMENT '状态：0待处理 1处理中 2待用户确认 3已关闭',
    `priority`            TINYINT         NOT NULL DEFAULT 2       COMMENT '优先级：1低 2中 3高 4紧急',
    -- SLA指标
    `response_deadline_at` DATETIME(3)    DEFAULT NULL           COMMENT '响应SLA截止时间',
    `first_response_at`   DATETIME(3)     DEFAULT NULL           COMMENT '首次响应时间',
    -- 处理人
    `assignee_id`         BIGINT          DEFAULT NULL           COMMENT '处理客服人员ID',
    -- 附件
    `images`              JSON            DEFAULT NULL           COMMENT '图片附件JSON [urls]',
    -- 满意度
    `satisfaction_score`  TINYINT         DEFAULT NULL           COMMENT '满意度(1-5)',
    `created_at`          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`          DATETIME(3)     DEFAULT NULL,
    `created_by`          BIGINT          DEFAULT NULL,
    `updated_by`          BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_ticket_no` (`ticket_no`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_order_id` (`order_id`),
    KEY `idx_status_priority` (`status`, `priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='客服工单表';

-- ----------------------------
-- 工单回复表 (ticket_replies) — T3W13-1~3
-- ----------------------------
CREATE TABLE IF NOT EXISTS `ticket_replies` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `ticket_id`   BIGINT          NOT NULL                COMMENT '工单ID',
    -- 回复信息
    `replyer_type`ENUM('user','staff','system') NOT NULL DEFAULT 'user' COMMENT '回复者类型',
    `replyer_id`  BIGINT          DEFAULT NULL            COMMENT '回复者ID',
    `content`     TEXT            NOT NULL                COMMENT '回复内容',
    -- 附件
    `images`      JSON            DEFAULT NULL            COMMENT '图片附件JSON [urls]',
    `created_at`  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`  DATETIME(3)     DEFAULT NULL,
    `created_by`  BIGINT          DEFAULT NULL,
    `updated_by`  BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_ticket_id` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工单回复表';

-- ============================
-- 9. 安全/审计模块
-- ============================

-- ----------------------------
-- 操作审计日志表 (audit_logs) — T3W14-6
-- ----------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `operator_id`   BIGINT          NOT NULL                COMMENT '操作者ID',
    `operator_role` ENUM('user','staff','system','admin') NOT NULL DEFAULT 'user' COMMENT '操作者角色',
    `action`        VARCHAR(50)     NOT NULL                COMMENT '操作类型(login/logout/order_create/payment/cancel等)',
    `target_module` VARCHAR(50)     DEFAULT NULL            COMMENT '目标模块(user/order/payment/vehicle/store等)',
    `target_id`     BIGINT          DEFAULT NULL            COMMENT '目标记录ID',
    `detail`        JSON            DEFAULT NULL            COMMENT '变更详情(JSON格式)',
    `ip`            VARCHAR(45)     DEFAULT NULL            COMMENT '来源IP',
    `user_agent`    VARCHAR(500)    DEFAULT NULL            COMMENT 'User-Agent',
    `created_at`    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at`    DATETIME(3)     DEFAULT NULL,
    `created_by`    BIGINT          DEFAULT NULL,
    `updated_by`    BIGINT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_operator_id` (`operator_id`),
    KEY `idx_action` (`action`),
    KEY `idx_target_module` (`target_module`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='操作审计日志表';

-- ============================================================
-- 外键约束 (可选，根据需要启用)
-- 注意：生产环境建议由应用层保证引用完整性
-- ============================================================

-- ALTER TABLE `driver_licenses` ADD CONSTRAINT `fk_driver_license_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`);
-- ALTER TABLE `orders` ADD CONSTRAINT `fk_order_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`);
-- ALTER TABLE `orders` ADD CONSTRAINT `fk_order_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`);
-- ALTER TABLE `orders` ADD CONSTRAINT `fk_order_store` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`);
-- ALTER TABLE `vehicles` ADD CONSTRAINT `fk_vehicle_store` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`);
-- ALTER TABLE `vehicles` ADD CONSTRAINT `fk_vehicle_model` FOREIGN KEY (`model_id`) REFERENCES `vehicle_models`(`id`);
-- ALTER TABLE `vehicle_images` ADD CONSTRAINT `fk_vi_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`);
-- ALTER TABLE `vehicle_maintenance` ADD CONSTRAINT `fk_vm_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`);
-- ALTER TABLE `order_logs` ADD CONSTRAINT `fk_ol_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`);
-- ALTER TABLE `payments` ADD CONSTRAINT `fk_payment_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`);
-- ALTER TABLE `refunds` ADD CONSTRAINT `fk_refund_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`);
-- ALTER TABLE `user_coupons` ADD CONSTRAINT `fk_uc_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`);
-- ALTER TABLE `staff_roles` ADD CONSTRAINT `fk_sr_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`);
-- ALTER TABLE `role_permissions` ADD CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`);

-- ============================================================
-- 完成
-- ============================================================

SET FOREIGN_KEY_CHECKS = 1;

-- 统计信息
SELECT '✅ 建表脚本执行完成!' AS result;
SELECT COUNT(*) AS total_tables FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE';
