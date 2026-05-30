-- ============================================================
-- 古月租车 (gy_bike) 数据库初始化脚本 V1
-- MySQL 8.0+ | 字符集 utf8mb4 | 引擎 InnoDB
-- ============================================================

CREATE DATABASE IF NOT EXISTS `gy_bike`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `gy_bike`;

SET NAMES utf8mb4;
SET GLOBAL time_zone = '+08:00';

-- ============================================================
-- 1. 用户模块
-- ============================================================

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `alipay_user_id` VARCHAR(64) NOT NULL COMMENT '支付宝用户open_id',
  `alipay_union_id` VARCHAR(64) NULL COMMENT '支付宝Union ID',
  `phone` VARCHAR(20) NULL COMMENT '手机号',
  `nickname` VARCHAR(64) NULL COMMENT '用户昵称',
  `avatar` VARCHAR(512) NULL COMMENT '头像URL',
  `real_name` VARCHAR(64) NULL COMMENT '真实姓名',
  `id_card_no` VARCHAR(18) NULL COMMENT '身份证号（加密）',
  `gender` TINYINT NULL DEFAULT 0 COMMENT '性别 0未知/1男/2女',
  `birthday` DATE NULL COMMENT '出生日期',
  `auth_status` TINYINT NOT NULL DEFAULT 0 COMMENT '认证状态 0未认证/1已实名/2已认证驾驶证',
  `auth_time` DATETIME(3) NULL COMMENT '认证时间',
  `zhima_score` INT NULL COMMENT '芝麻信用分',
  `zhima_score_time` DATETIME(3) NULL COMMENT '芝麻分更新时间',
  `credit_free_deposit` TINYINT NOT NULL DEFAULT 0 COMMENT '信用免押 0无/1有',
  `level_id` BIGINT NULL COMMENT '会员等级ID',
  `growth_value` INT NOT NULL DEFAULT 0 COMMENT '成长值',
  `points` INT NOT NULL DEFAULT 0 COMMENT '积分余额',
  `emergency_contact` VARCHAR(64) NULL COMMENT '紧急联系人姓名',
  `emergency_phone` VARCHAR(20) NULL COMMENT '紧急联系人电话',
  `order_count` INT NOT NULL DEFAULT 0 COMMENT '订单总数',
  `total_amount` BIGINT NOT NULL DEFAULT 0 COMMENT '累计消费(分)',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态 0禁用/1正常/2黑名单',
  `status_reason` VARCHAR(255) NULL COMMENT '状态变更原因',
  `status_time` DATETIME(3) NULL COMMENT '状态变更时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `created_by` BIGINT NULL COMMENT '创建人ID',
  `updated_by` BIGINT NULL COMMENT '更新人ID',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间（软删除）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_alipay_user_id` (`alipay_user_id`),
  UNIQUE KEY `uk_users_phone` (`phone`),
  KEY `idx_users_level_id` (`level_id`),
  KEY `idx_users_auth_status` (`auth_status`),
  KEY `idx_users_status` (`status`),
  KEY `idx_users_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户主表';

DROP TABLE IF EXISTS `driver_licenses`;
CREATE TABLE `driver_licenses` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '驾驶证ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `license_no` VARCHAR(18) NULL COMMENT '驾驶证编号',
  `real_name` VARCHAR(64) NOT NULL COMMENT '姓名',
  `id_card_no` VARCHAR(18) NOT NULL COMMENT '身份证号（加密）',
  `gender` TINYINT NULL COMMENT '性别 1男/2女',
  `birthday` DATE NULL COMMENT '出生日期',
  `nationality` VARCHAR(32) NULL DEFAULT '中国' COMMENT '国籍',
  `address` VARCHAR(255) NULL COMMENT '住址',
  `vehicle_class` VARCHAR(32) NOT NULL COMMENT '准驾车型',
  `issue_date` DATE NOT NULL COMMENT '初次领证日期',
  `valid_from` DATE NOT NULL COMMENT '有效起始日期',
  `valid_to` DATE NOT NULL COMMENT '有效截止日期',
  `file_no` VARCHAR(64) NULL COMMENT '档案编号',
  `issuing_authority` VARCHAR(128) NULL COMMENT '发证机关',
  `front_image_url` VARCHAR(512) NOT NULL COMMENT '驾驶证正面图片URL',
  `back_image_url` VARCHAR(512) NULL COMMENT '驾驶证副页图片URL',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '审核状态 0待审核/1通过/2拒绝/3已过期',
  `reject_reason` VARCHAR(255) NULL COMMENT '拒绝原因',
  `auditor_id` BIGINT NULL COMMENT '审核人ID',
  `audit_time` DATETIME(3) NULL COMMENT '审核时间',
  `ocr_data` JSON NULL COMMENT 'OCR识别原始数据',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `created_by` BIGINT NULL COMMENT '创建人ID',
  `updated_by` BIGINT NULL COMMENT '更新人ID',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间（软删除）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_driver_licenses_user_id` (`user_id`),
  KEY `idx_driver_licenses_status` (`status`),
  KEY `idx_driver_licenses_valid_to` (`valid_to`),
  CONSTRAINT `fk_driver_licenses_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='驾驶证信息表';

DROP TABLE IF EXISTS `user_levels`;
CREATE TABLE `user_levels` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '等级ID',
  `level_code` VARCHAR(32) NOT NULL COMMENT '等级编码 BRONZE/SILVER/GOLD/PLATINUM/DIAMOND',
  `level_name` VARCHAR(32) NOT NULL COMMENT '等级名称',
  `level_icon` VARCHAR(512) NULL COMMENT '等级图标URL',
  `level` INT NOT NULL COMMENT '等级数值(1-5)',
  `min_growth_value` INT NOT NULL COMMENT '升级最低成长值',
  `max_growth_value` INT NULL COMMENT '等级区间上限',
  `benefits` JSON NOT NULL COMMENT '等级权益配置JSON',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态 0禁用/1启用',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `created_by` BIGINT NULL COMMENT '创建人ID',
  `updated_by` BIGINT NULL COMMENT '更新人ID',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间（软删除）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_levels_level_code` (`level_code`),
  KEY `idx_user_levels_level` (`level`),
  KEY `idx_user_levels_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员等级配置表';

-- ============================================================
-- 2. 车辆模块
-- ============================================================

DROP TABLE IF EXISTS `stores`;
CREATE TABLE `stores` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '门店ID',
  `store_code` VARCHAR(32) NOT NULL COMMENT '门店编码',
  `store_name` VARCHAR(128) NOT NULL COMMENT '门店名称',
  `store_type` TINYINT NOT NULL DEFAULT 1 COMMENT '类型 1直营/2加盟/3合作',
  `contact_name` VARCHAR(64) NULL COMMENT '负责人姓名',
  `contact_phone` VARCHAR(20) NOT NULL COMMENT '联系电话',
  `service_phone` VARCHAR(20) NULL COMMENT '客服电话',
  `province` VARCHAR(32) NULL COMMENT '省份',
  `city` VARCHAR(32) NOT NULL COMMENT '城市',
  `district` VARCHAR(32) NULL COMMENT '区县',
  `address` VARCHAR(255) NOT NULL COMMENT '详细地址',
  `longitude` DECIMAL(10, 6) NOT NULL COMMENT '经度',
  `latitude` DECIMAL(10, 6) NOT NULL COMMENT '纬度',
  `geohash` VARCHAR(12) NULL COMMENT 'GeoHash编码',
  `open_time` TIME NULL DEFAULT '08:00:00' COMMENT '营业开始',
  `close_time` TIME NULL DEFAULT '20:00:00' COMMENT '营业结束',
  `service_radius` INT NOT NULL DEFAULT 5000 COMMENT '服务半径(米)',
  `store_images` JSON NULL COMMENT '门店图片列表',
  `is_active` TINYINT NOT NULL DEFAULT 1 COMMENT '状态 0关闭/1营业中/2装修中',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序权重',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `created_by` BIGINT NULL COMMENT '创建人ID',
  `updated_by` BIGINT NULL COMMENT '更新人ID',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间（软删除）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_stores_store_code` (`store_code`),
  KEY `idx_stores_city` (`city`),
  KEY `idx_stores_is_active` (`is_active`),
  KEY `idx_stores_geohash` (`geohash`),
  KEY `idx_stores_longitude_latitude` (`longitude`, `latitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='门店表';

DROP TABLE IF EXISTS `vehicle_models`;
CREATE TABLE `vehicle_models` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '车型ID',
  `model_code` VARCHAR(32) NOT NULL COMMENT '车型编码',
  `model_name` VARCHAR(64) NOT NULL COMMENT '车型名称',
  `brand` VARCHAR(32) NOT NULL COMMENT '品牌',
  `series` VARCHAR(64) NULL COMMENT '车系',
  `vehicle_type` TINYINT NOT NULL COMMENT '类型 1轿车/2SUV/3MPV/4商务/5新能源',
  `energy_type` TINYINT NOT NULL COMMENT '能源 1汽油/2柴油/3电动/4混动',
  `gearbox_type` TINYINT NOT NULL COMMENT '变速箱 1手动/2自动',
  `seats` INT NOT NULL COMMENT '座位数',
  `displacement` VARCHAR(16) NULL COMMENT '排量',
  `fuel_consumption` DECIMAL(4, 1) NULL COMMENT '百公里油耗',
  `endurance` INT NULL COMMENT '续航里程(km)',
  `color` VARCHAR(32) NULL COMMENT '车身颜色',
  `daily_price_cents` BIGINT NOT NULL COMMENT '日租价格(分)',
  `weekly_price_cents` BIGINT NULL COMMENT '周租价格(分)',
  `monthly_price_cents` BIGINT NULL COMMENT '月租价格(分)',
  `deposit_amount` BIGINT NOT NULL COMMENT '押金(分)',
  `violation_deposit` BIGINT NOT NULL COMMENT '违章押金(分)',
  `service_fee_rate` DECIMAL(5, 4) NOT NULL DEFAULT 0.0500 COMMENT '服务费率',
  `insurance_fee_cents` BIGINT NOT NULL DEFAULT 3000 COMMENT '基础保险(分/天)',
  `member_discount` DECIMAL(3, 2) NOT NULL DEFAULT 1.00 COMMENT '会员折扣',
  `features` JSON NULL COMMENT '车辆配置JSON',
  `main_image_url` VARCHAR(512) NULL COMMENT '主图URL',
  `detail_images` JSON NULL COMMENT '详情图片列表',
  `is_active` TINYINT NOT NULL DEFAULT 1 COMMENT '状态 0下架/1上架',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `is_hot` TINYINT NOT NULL DEFAULT 0 COMMENT '热门 0否/1是',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `created_by` BIGINT NULL COMMENT '创建人ID',
  `updated_by` BIGINT NULL COMMENT '更新人ID',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间（软删除）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_vehicle_models_model_code` (`model_code`),
  KEY `idx_vehicle_models_brand` (`brand`),
  KEY `idx_vehicle_models_vehicle_type` (`vehicle_type`),
  KEY `idx_vehicle_models_is_active` (`is_active`),
  KEY `idx_vehicle_models_daily_price` (`daily_price_cents`),
  KEY `idx_vehicle_models_is_hot` (`is_hot`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='车型模板表';

DROP TABLE IF EXISTS `vehicles`;
CREATE TABLE `vehicles` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '车辆ID',
  `vehicle_no` VARCHAR(32) NOT NULL COMMENT '车辆编号',
  `plate_number` VARCHAR(16) NOT NULL COMMENT '车牌号',
  `model_id` BIGINT NOT NULL COMMENT '车型ID',
  `store_id` BIGINT NOT NULL COMMENT '所属门店ID',
  `vin` VARCHAR(17) NULL COMMENT 'VIN码',
  `engine_no` VARCHAR(32) NULL COMMENT '发动机号',
  `register_date` DATE NULL COMMENT '上牌日期',
  `mileage` INT NOT NULL DEFAULT 0 COMMENT '里程(公里)',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态 0停用/1待租/2已租/3维护中',
  `status_reason` VARCHAR(255) NULL COMMENT '状态变更原因',
  `current_order_id` BIGINT NULL COMMENT '当前订单ID',
  `current_user_id` BIGINT NULL COMMENT '当前租户ID',
  `last_maintenance_at` DATETIME(3) NULL COMMENT '上次维护时间',
  `next_maintenance_mileage` INT NULL COMMENT '下次维护里程',
  `next_maintenance_at` DATETIME(3) NULL COMMENT '下次维护时间',
  `insurance_company` VARCHAR(64) NULL COMMENT '保险公司',
  `insurance_policy_no` VARCHAR(64) NULL COMMENT '保单号',
  `insurance_expire_date` DATE NULL COMMENT '保险到期日',
  `annual_inspection_expire_date` DATE NULL COMMENT '年检到期日',
  `vehicle_images` JSON NULL COMMENT '实拍图片列表',
  `remark` TEXT NULL COMMENT '备注',
  `is_active` TINYINT NOT NULL DEFAULT 1 COMMENT '启用 0停用/1启用',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `created_by` BIGINT NULL COMMENT '创建人ID',
  `updated_by` BIGINT NULL COMMENT '更新人ID',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间（软删除）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_vehicles_vehicle_no` (`vehicle_no`),
  UNIQUE KEY `uk_vehicles_plate_number` (`plate_number`),
  KEY `idx_vehicles_model_id` (`model_id`),
  KEY `idx_vehicles_store_id` (`store_id`),
  KEY `idx_vehicles_status` (`status`),
  KEY `idx_vehicles_store_status` (`store_id`, `status`),
  CONSTRAINT `fk_vehicles_vehicle_models` FOREIGN KEY (`model_id`) REFERENCES `vehicle_models` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_vehicles_stores` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='车辆实例表';

DROP TABLE IF EXISTS `vehicle_images`;
CREATE TABLE `vehicle_images` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '图片ID',
  `vehicle_id` BIGINT NOT NULL COMMENT '车辆ID',
  `image_type` TINYINT NOT NULL COMMENT '类型 1外观/2内饰/3证件/4验车/5其他',
  `image_url` VARCHAR(512) NOT NULL COMMENT '图片URL',
  `thumbnail_url` VARCHAR(512) NULL COMMENT '缩略图URL',
  `image_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `remark` VARCHAR(255) NULL COMMENT '备注',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `created_by` BIGINT NULL COMMENT '创建人ID',
  `updated_by` BIGINT NULL COMMENT '更新人ID',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间（软删除）',
  PRIMARY KEY (`id`),
  KEY `idx_vehicle_images_vehicle_id` (`vehicle_id`),
  KEY `idx_vehicle_images_image_type` (`image_type`),
  CONSTRAINT `fk_vehicle_images_vehicles` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='车辆图片表';

DROP TABLE IF EXISTS `vehicle_maintenance`;
CREATE TABLE `vehicle_maintenance` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `vehicle_id` BIGINT NOT NULL COMMENT '车辆ID',
  `maintenance_type` TINYINT NOT NULL COMMENT '类型 1定期保养/2故障维修/3事故维修/4年检/5其他',
  `maintenance_date` DATE NOT NULL COMMENT '维护日期',
  `mileage` INT NOT NULL COMMENT '维护时里程',
  `description` TEXT NOT NULL COMMENT '维护内容描述',
  `cost_cents` BIGINT NOT NULL DEFAULT 0 COMMENT '维护费用(分)',
  `service_provider` VARCHAR(128) NULL COMMENT '服务商',
  `related_order_id` BIGINT NULL COMMENT '关联订单ID',
  `images` JSON NULL COMMENT '维护图片列表',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态 0进行中/1已完成',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `created_by` BIGINT NULL COMMENT '创建人ID',
  `updated_by` BIGINT NULL COMMENT '更新人ID',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间（软删除）',
  PRIMARY KEY (`id`),
  KEY `idx_vehicle_maintenance_vehicle_id` (`vehicle_id`),
  KEY `idx_vehicle_maintenance_type` (`maintenance_type`),
  KEY `idx_vehicle_maintenance_date` (`maintenance_date`),
  CONSTRAINT `fk_vehicle_maintenance_vehicles` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='车辆维护记录表';

-- ============================================================
-- 3. 订单模块
-- ============================================================

DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '订单ID',
  `order_no` VARCHAR(32) NOT NULL COMMENT '订单编号',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `vehicle_id` BIGINT NOT NULL COMMENT '车辆ID',
  `model_id` BIGINT NOT NULL COMMENT '车型ID',
  `pickup_store_id` BIGINT NOT NULL COMMENT '取车门店ID',
  `return_store_id` BIGINT NOT NULL COMMENT '还车门店ID',
  `pickup_time` DATETIME(3) NOT NULL COMMENT '预约取车时间',
  `return_time` DATETIME(3) NOT NULL COMMENT '预约还车时间',
  `actual_pickup_time` DATETIME(3) NULL COMMENT '实际取车时间',
  `actual_return_time` DATETIME(3) NULL COMMENT '实际还车时间',
  `rental_days` INT NOT NULL COMMENT '租赁天数',
  `daily_price_cents` BIGINT NOT NULL COMMENT '日租单价(分)',
  `rental_fee_cents` BIGINT NOT NULL COMMENT '租金(分)',
  `service_fee_cents` BIGINT NOT NULL DEFAULT 0 COMMENT '服务费(分)',
  `insurance_fee_cents` BIGINT NOT NULL DEFAULT 0 COMMENT '保险费(分)',
  `deposit_cents` BIGINT NOT NULL COMMENT '押金(分)',
  `violation_deposit_cents` BIGINT NOT NULL COMMENT '违章押金(分)',
  `coupon_discount_cents` BIGINT NOT NULL DEFAULT 0 COMMENT '优惠券抵扣(分)',
  `points_discount_cents` BIGINT NOT NULL DEFAULT 0 COMMENT '积分抵扣(分)',
  `total_amount_cents` BIGINT NOT NULL COMMENT '总金额(分)',
  `paid_amount_cents` BIGINT NOT NULL DEFAULT 0 COMMENT '实付(分)',
  `refund_amount_cents` BIGINT NOT NULL DEFAULT 0 COMMENT '退款(分)',
  `coupon_id` BIGINT NULL COMMENT '使用的优惠券ID',
  `points_used` INT NOT NULL DEFAULT 0 COMMENT '使用积分',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态 0待支付/1已支付/2已取车/3待结算/4已完成/5已取消/6已退款',
  `status_reason` VARCHAR(255) NULL COMMENT '状态原因',
  `pickup_staff_id` BIGINT NULL COMMENT '取车经办人',
  `pickup_mileage` INT NULL COMMENT '取车里程',
  `pickup_fuel_level` TINYINT NULL COMMENT '取车油量 1-5',
  `pickup_images` JSON NULL COMMENT '取车验车图片',
  `return_staff_id` BIGINT NULL COMMENT '还车经办人',
  `return_mileage` INT NULL COMMENT '还车里程',
  `return_fuel_level` TINYINT NULL COMMENT '还车油量 1-5',
  `return_images` JSON NULL COMMENT '还车验车图片',
  `is_renewed` TINYINT NOT NULL DEFAULT 0 COMMENT '是否续租',
  `renewal_count` INT NOT NULL DEFAULT 0 COMMENT '续租次数',
  `is_evaluated` TINYINT NOT NULL DEFAULT 0 COMMENT '是否已评价',
  `evaluate_time` DATETIME(3) NULL COMMENT '评价时间',
  `invoice_status` TINYINT NOT NULL DEFAULT 0 COMMENT '发票状态 0未申请/1已申请/2已开具',
  `remark` TEXT NULL COMMENT '备注',
  `source` TINYINT NOT NULL DEFAULT 1 COMMENT '来源 1小程序/2商家/3API',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `created_by` BIGINT NULL COMMENT '创建人ID',
  `updated_by` BIGINT NULL COMMENT '更新人ID',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间（软删除）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_orders_order_no` (`order_no`),
  KEY `idx_orders_user_id` (`user_id`),
  KEY `idx_orders_vehicle_id` (`vehicle_id`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_pickup_time` (`pickup_time`),
  KEY `idx_orders_return_time` (`return_time`),
  KEY `idx_orders_user_status` (`user_id`, `status`),
  KEY `idx_orders_vehicle_status` (`vehicle_id`, `status`),
  CONSTRAINT `fk_orders_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_vehicles` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_models` FOREIGN KEY (`model_id`) REFERENCES `vehicle_models` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_pickup_stores` FOREIGN KEY (`pickup_store_id`) REFERENCES `stores` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_return_stores` FOREIGN KEY (`return_store_id`) REFERENCES `stores` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单主表';

DROP TABLE IF EXISTS `order_logs`;
CREATE TABLE `order_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `order_id` BIGINT NOT NULL COMMENT '订单ID',
  `order_no` VARCHAR(32) NOT NULL COMMENT '订单编号',
  `from_status` TINYINT NULL COMMENT '原状态',
  `to_status` TINYINT NOT NULL COMMENT '新状态',
  `action` VARCHAR(32) NOT NULL COMMENT '操作类型',
  `operator_type` TINYINT NOT NULL COMMENT '操作者 1用户/2员工/3系统',
  `operator_id` BIGINT NULL COMMENT '操作者ID',
  `operator_name` VARCHAR(64) NULL COMMENT '操作者姓名',
  `change_content` JSON NULL COMMENT '变更详情JSON',
  `remark` TEXT NULL COMMENT '备注',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_order_logs_order_id` (`order_id`),
  KEY `idx_order_logs_action` (`action`),
  CONSTRAINT `fk_order_logs_orders` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单操作日志表';

-- ============================================================
-- 4. 支付模块
-- ============================================================

DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '支付ID',
  `order_id` BIGINT NOT NULL COMMENT '订单ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `pay_no` VARCHAR(32) NOT NULL COMMENT '支付单号',
  `pay_type` TINYINT NOT NULL COMMENT '类型 1租金/2押金/3违章押金/4续租/5其他',
  `amount_cents` BIGINT NOT NULL COMMENT '支付金额(分)',
  `channel` VARCHAR(32) NOT NULL DEFAULT 'ALIPAY' COMMENT '支付渠道',
  `channel_trade_no` VARCHAR(64) NULL COMMENT '第三方交易号',
  `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT '状态 PENDING/SUCCESS/FAILED/CLOSED',
  `pay_time` DATETIME(3) NULL COMMENT '支付完成时间',
  `callback_raw` JSON NULL COMMENT '回调原始数据',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payments_pay_no` (`pay_no`),
  KEY `idx_payments_order_id` (`order_id`),
  KEY `idx_payments_user_id` (`user_id`),
  KEY `idx_payments_channel_trade_no` (`channel_trade_no`),
  CONSTRAINT `fk_payments_orders` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付记录表';

DROP TABLE IF EXISTS `preauths`;
CREATE TABLE `preauths` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '预授权ID',
  `order_id` BIGINT NOT NULL COMMENT '订单ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `preauth_no` VARCHAR(32) NOT NULL COMMENT '预授权单号',
  `amount_cents` BIGINT NOT NULL COMMENT '冻结金额(分)',
  `channel` VARCHAR(32) NOT NULL DEFAULT 'ALIPAY' COMMENT '渠道',
  `channel_preauth_no` VARCHAR(64) NULL COMMENT '第三方预授权号',
  `status` VARCHAR(16) NOT NULL DEFAULT 'FROZEN' COMMENT 'FROZEN/UNFROZEN/DEDUCTED',
  `frozen_at` DATETIME(3) NULL COMMENT '冻结时间',
  `unfrozen_at` DATETIME(3) NULL COMMENT '解冻时间',
  `deducted_at` DATETIME(3) NULL COMMENT '扣款时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_preauths_preauth_no` (`preauth_no`),
  KEY `idx_preauths_order_id` (`order_id`),
  CONSTRAINT `fk_preauths_orders` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='预授权记录表';

DROP TABLE IF EXISTS `refunds`;
CREATE TABLE `refunds` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '退款ID',
  `order_id` BIGINT NOT NULL COMMENT '订单ID',
  `payment_id` BIGINT NOT NULL COMMENT '原支付ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `refund_no` VARCHAR(32) NOT NULL COMMENT '退款单号',
  `amount_cents` BIGINT NOT NULL COMMENT '退款金额(分)',
  `reason` VARCHAR(255) NULL COMMENT '退款原因',
  `channel` VARCHAR(32) NOT NULL DEFAULT 'ALIPAY' COMMENT '渠道',
  `channel_refund_no` VARCHAR(64) NULL COMMENT '第三方退款号',
  `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/SUCCESS/FAILED',
  `refund_type` VARCHAR(16) NOT NULL DEFAULT 'FULL' COMMENT 'FULL/PARTIAL',
  `refund_time` DATETIME(3) NULL COMMENT '退款完成时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_refunds_refund_no` (`refund_no`),
  KEY `idx_refunds_order_id` (`order_id`),
  KEY `idx_refunds_payment_id` (`payment_id`),
  CONSTRAINT `fk_refunds_orders` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='退款记录表';

-- ============================================================
-- 5. 营销模块
-- ============================================================

DROP TABLE IF EXISTS `coupons`;
CREATE TABLE `coupons` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '优惠券ID',
  `coupon_code` VARCHAR(32) NOT NULL COMMENT '券编码',
  `coupon_name` VARCHAR(64) NOT NULL COMMENT '券名称',
  `coupon_type` TINYINT NOT NULL COMMENT '类型 1满减/2折扣/3立减/4免押/5新人',
  `discount_value` DECIMAL(10, 2) NULL COMMENT '优惠值',
  `min_order_amount` BIGINT NOT NULL DEFAULT 0 COMMENT '最低订单金额(分)',
  `max_discount_amount` BIGINT NULL COMMENT '最大优惠(分)',
  `total_quantity` INT NOT NULL COMMENT '总发行量',
  `issued_quantity` INT NOT NULL DEFAULT 0 COMMENT '已发放量',
  `used_quantity` INT NOT NULL DEFAULT 0 COMMENT '已使用量',
  `user_limit` INT NOT NULL DEFAULT 1 COMMENT '每人限领',
  `valid_days` INT NOT NULL COMMENT '有效期(天)',
  `start_time` DATETIME(3) NULL COMMENT '开始时间',
  `end_time` DATETIME(3) NULL COMMENT '结束时间',
  `rules` JSON NULL COMMENT '使用规则JSON',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态 0停用/1启用',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `created_by` BIGINT NULL COMMENT '创建人ID',
  `updated_by` BIGINT NULL COMMENT '更新人ID',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间（软删除）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_coupons_coupon_code` (`coupon_code`),
  KEY `idx_coupons_status` (`status`),
  KEY `idx_coupons_start_end` (`start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='优惠券模板表';

DROP TABLE IF EXISTS `user_coupons`;
CREATE TABLE `user_coupons` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '用户券ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `coupon_id` BIGINT NOT NULL COMMENT '券模板ID',
  `coupon_code` VARCHAR(32) NOT NULL COMMENT '券编码(冗余)',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态 0未使用/1已使用/2已过期',
  `receive_time` DATETIME(3) NOT NULL COMMENT '领取时间',
  `use_time` DATETIME(3) NULL COMMENT '使用时间',
  `expire_time` DATETIME(3) NOT NULL COMMENT '过期时间',
  `order_id` BIGINT NULL COMMENT '使用订单ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_coupons_user_id` (`user_id`),
  KEY `idx_user_coupons_coupon_id` (`coupon_id`),
  KEY `idx_user_coupons_status` (`status`),
  KEY `idx_user_coupons_user_status` (`user_id`, `status`),
  CONSTRAINT `fk_user_coupons_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_coupons_coupons` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户优惠券表';

DROP TABLE IF EXISTS `points_records`;
CREATE TABLE `points_records` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `action` VARCHAR(32) NOT NULL COMMENT '操作 SIGN/ORDER/EVALUATE/EXCHANGE/EXPIRE',
  `points` INT NOT NULL COMMENT '积分变动(正增/负减)',
  `balance_after` INT NOT NULL COMMENT '变动后余额',
  `related_order_id` BIGINT NULL COMMENT '关联订单ID',
  `remark` VARCHAR(255) NULL COMMENT '备注',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_points_records_user_id` (`user_id`),
  KEY `idx_points_records_action` (`action`),
  CONSTRAINT `fk_points_records_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分流水表';

-- ============================================================
-- 6. 工单模块
-- ============================================================

DROP TABLE IF EXISTS `tickets`;
CREATE TABLE `tickets` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '工单ID',
  `ticket_no` VARCHAR(32) NULL COMMENT '工单编号',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `ticket_type` VARCHAR(32) NOT NULL DEFAULT 'other' COMMENT '类型 accident/payment/refund/order_issue/vehicle/account/suggestion/other',
  `title` VARCHAR(128) NULL COMMENT '标题',
  `content` TEXT NOT NULL COMMENT '内容',
  `order_id` BIGINT NULL COMMENT '关联订单ID',
  `priority` TINYINT NOT NULL DEFAULT 2 COMMENT '优先级 1低/2中/3高/4紧急',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态 0待受理/1处理中/2等待回复/3已解决/-1已拒绝/-2已关闭/4重新打开',
  `images` JSON NULL COMMENT '图片附件',
  `assignee_id` BIGINT NULL COMMENT '受理人ID',
  `first_response_at` DATETIME(3) NULL COMMENT '首次响应时间',
  `response_deadline_at` DATETIME(3) NULL COMMENT '响应截止时间',
  `satisfaction_score` TINYINT NULL COMMENT '满意度 1-5',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_tickets_user_id` (`user_id`),
  KEY `idx_tickets_status` (`status`),
  KEY `idx_tickets_ticket_type` (`ticket_type`),
  KEY `idx_tickets_assignee_id` (`assignee_id`),
  CONSTRAINT `fk_tickets_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单表';

DROP TABLE IF EXISTS `ticket_replies`;
CREATE TABLE `ticket_replies` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '回复ID',
  `ticket_id` BIGINT NOT NULL COMMENT '工单ID',
  `replyer_type` VARCHAR(16) NOT NULL COMMENT '回复者 user/staff/system',
  `replyer_id` BIGINT NOT NULL COMMENT '回复者ID',
  `content` TEXT NOT NULL COMMENT '回复内容',
  `images` JSON NULL COMMENT '附件图片',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_ticket_replies_ticket_id` (`ticket_id`),
  CONSTRAINT `fk_ticket_replies_tickets` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单回复表';

-- ============================================================
-- 7. 权限模块 (RBAC)
-- ============================================================

DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '角色ID',
  `role_name` VARCHAR(64) NOT NULL COMMENT '角色名称',
  `role_code` VARCHAR(32) NOT NULL COMMENT '角色编码',
  `description` VARCHAR(255) NULL COMMENT '角色描述',
  `is_active` TINYINT NOT NULL DEFAULT 1 COMMENT '状态 0停用/1启用',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_roles_role_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '权限ID',
  `permission_code` VARCHAR(64) NOT NULL COMMENT '权限编码',
  `permission_name` VARCHAR(64) NOT NULL COMMENT '权限名称',
  `resource` VARCHAR(32) NOT NULL COMMENT '资源',
  `action` VARCHAR(32) NOT NULL COMMENT '操作',
  `module` VARCHAR(64) NULL COMMENT '所属模块',
  `parent_id` BIGINT NULL COMMENT '父权限ID',
  `description` VARCHAR(255) NULL COMMENT '描述',
  `is_active` TINYINT NOT NULL DEFAULT 1 COMMENT '状态 0停用/1启用',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_permissions_code` (`permission_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `role_id` BIGINT NOT NULL COMMENT '角色ID',
  `permission_id` BIGINT NOT NULL COMMENT '权限ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permissions` (`role_id`, `permission_id`),
  CONSTRAINT `fk_role_permissions_roles` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_role_permissions_permissions` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

DROP TABLE IF EXISTS `staff`;
CREATE TABLE `staff` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '员工ID',
  `staff_no` VARCHAR(32) NOT NULL COMMENT '工号',
  `account` VARCHAR(64) NOT NULL COMMENT '登录账号',
  `password_hash` VARCHAR(128) NOT NULL COMMENT '密码哈希',
  `real_name` VARCHAR(64) NOT NULL COMMENT '真实姓名',
  `phone` VARCHAR(20) NULL COMMENT '手机号',
  `avatar_url` VARCHAR(512) NULL COMMENT '头像',
  `store_id` BIGINT NULL COMMENT '所属门店ID',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态 0正常/1禁用/2锁定',
  `last_login_at` DATETIME(3) NULL COMMENT '最后登录时间',
  `login_count` INT NOT NULL DEFAULT 0 COMMENT '登录次数',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_staff_staff_no` (`staff_no`),
  UNIQUE KEY `uk_staff_account` (`account`),
  KEY `idx_staff_store_id` (`store_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工表';

DROP TABLE IF EXISTS `staff_roles`;
CREATE TABLE `staff_roles` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `staff_id` BIGINT NOT NULL COMMENT '员工ID',
  `role_id` BIGINT NOT NULL COMMENT '角色ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_staff_roles` (`staff_id`, `role_id`),
  KEY `idx_staff_roles_role_id` (`role_id`),
  CONSTRAINT `fk_staff_roles_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_staff_roles_roles` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工角色关联表';

-- ============================================================
-- 8. 消息模块
-- ============================================================

DROP TABLE IF EXISTS `message_logs`;
CREATE TABLE `message_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '消息ID',
  `user_id` BIGINT NULL COMMENT '接收用户ID',
  `message_type` VARCHAR(32) NOT NULL COMMENT '类型 SMS/MINI_SUBSCRIBE/IN_APP',
  `title` VARCHAR(128) NULL COMMENT '标题',
  `content` TEXT NOT NULL COMMENT '内容',
  `template_code` VARCHAR(64) NULL COMMENT '模板编码',
  `channel` VARCHAR(32) NOT NULL DEFAULT 'IN_APP' COMMENT '渠道',
  `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/SENT/FAILED/READ',
  `send_result` JSON NULL COMMENT '发送结果',
  `read_at` DATETIME(3) NULL COMMENT '阅读时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_message_logs_user_id` (`user_id`),
  KEY `idx_message_logs_type` (`message_type`),
  KEY `idx_message_logs_status` (`status`),
  KEY `idx_message_logs_user_status` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息日志表';

-- ============================================================
-- 9. 在线客服模块
-- ============================================================

DROP TABLE IF EXISTS `chat_messages`;
CREATE TABLE `chat_messages` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '消息ID',
  `conversation_id` VARCHAR(64) NOT NULL COMMENT '会话ID',
  `sender_id` VARCHAR(64) NOT NULL COMMENT '发送者ID',
  `sender_role` VARCHAR(16) NOT NULL COMMENT '角色 user/staff/bot/system',
  `receiver_id` VARCHAR(64) NULL COMMENT '接收者ID',
  `content` TEXT NOT NULL COMMENT '消息内容',
  `msg_type` VARCHAR(16) NOT NULL DEFAULT 'text' COMMENT '消息类型 text/image/order_card/system',
  `metadata` JSON NULL COMMENT '扩展数据',
  `read_at` DATETIME(3) NULL COMMENT '已读时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_chat_messages_conversation_id` (`conversation_id`),
  KEY `idx_chat_messages_sender_id` (`sender_id`),
  KEY `idx_chat_messages_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='聊天消息表';

-- ============================================================
-- 10. 评价模块
-- ============================================================

DROP TABLE IF EXISTS `reviews`;
CREATE TABLE `reviews` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '评价ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `order_id` BIGINT NOT NULL COMMENT '订单ID',
  `vehicle_id` BIGINT NOT NULL COMMENT '车辆ID',
  `rating` TINYINT NOT NULL COMMENT '评分 1-5',
  `content` TEXT NULL COMMENT '评价内容',
  `images` JSON NULL COMMENT '图片列表',
  `tags` JSON NULL COMMENT '标签列表',
  `reply_content` TEXT NULL COMMENT '商家回复',
  `replied_at` DATETIME(3) NULL COMMENT '回复时间',
  `status` ENUM('PENDING','APPROVED','REJECTED','HIDDEN') NOT NULL DEFAULT 'PENDING' COMMENT '审核状态',
  `audit_result` VARCHAR(255) NULL COMMENT '审核说明',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reviews_order_id` (`order_id`),
  KEY `idx_reviews_user_id` (`user_id`),
  KEY `idx_reviews_vehicle_id` (`vehicle_id`),
  KEY `idx_reviews_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评价表';

-- ============================================================
-- 10. 金融模块 (钱包/发票/违章/续租)
-- ============================================================

DROP TABLE IF EXISTS `wallet`;
CREATE TABLE `wallet` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '钱包ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `balance_cents` BIGINT NOT NULL DEFAULT 0 COMMENT '余额(分)',
  `frozen_amount` BIGINT NOT NULL DEFAULT 0 COMMENT '冻结金额(分)',
  `version` INT NOT NULL DEFAULT 1 COMMENT '版本号(乐观锁)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wallet_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户钱包表';

DROP TABLE IF EXISTS `wallet_transaction`;
CREATE TABLE `wallet_transaction` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '流水ID',
  `wallet_id` INT NOT NULL COMMENT '钱包ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `type` ENUM('RECHARGE','PAY','REFUND','DEDUCTION','REBATE') NOT NULL COMMENT '交易类型',
  `amount_cents` BIGINT NOT NULL COMMENT '变动金额(分)',
  `balance_after_cents` BIGINT NOT NULL COMMENT '变动后余额(分)',
  `order_id` INT NULL COMMENT '关联订单ID',
  `remark` TEXT NULL COMMENT '备注',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_wallet_tx_user_id` (`user_id`),
  KEY `idx_wallet_tx_type` (`type`),
  KEY `idx_wallet_tx_user_type` (`user_id`, `type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='钱包交易流水表';

DROP TABLE IF EXISTS `violation_deposit`;
CREATE TABLE `violation_deposit` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `order_id` INT NOT NULL COMMENT '关联订单ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `vehicle_id` INT NULL COMMENT '车辆ID',
  `amount_cents` BIGINT NOT NULL DEFAULT 0 COMMENT '冻结金额(分)',
  `status` ENUM('FROZEN','DEDUCTED','REFUNDED','PARTIAL_REFUND') NOT NULL DEFAULT 'FROZEN' COMMENT '状态',
  `frozen_transaction_id` VARCHAR(64) NULL COMMENT '冻结交易流水号',
  `deduction_amount` BIGINT NULL COMMENT '实际扣除(分)',
  `refund_amount` BIGINT NULL COMMENT '退还金额(分)',
  `violation_detail` JSON NULL COMMENT '违章详情JSON',
  `deducted_at` DATETIME(3) NULL COMMENT '扣除时间',
  `refunded_at` DATETIME(3) NULL COMMENT '退还时间',
  `observation_end_at` DATETIME(3) NULL COMMENT '观察期截止时间',
  `remark` TEXT NULL COMMENT '备注',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_violation_order_id` (`order_id`),
  KEY `idx_violation_user_id` (`user_id`),
  KEY `idx_violation_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='违章押金表';

DROP TABLE IF EXISTS `order_renewal`;
CREATE TABLE `order_renewal` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '续租ID',
  `order_id` INT NOT NULL COMMENT '关联订单ID',
  `original_return_time` DATETIME(3) NOT NULL COMMENT '原计划还车时间',
  `requested_days` INT NOT NULL COMMENT '申请延长(天)',
  `extra_fare_cents` BIGINT NOT NULL DEFAULT 0 COMMENT '额外费用(分)',
  `status` ENUM('PENDING','APPROVED','REJECTED','PAID','CANCELLED') NOT NULL DEFAULT 'PENDING' COMMENT '状态',
  `approve_remark` TEXT NULL COMMENT '审批备注',
  `approved_by` INT NULL COMMENT '审批人',
  `approved_at` DATETIME(3) NULL COMMENT '审批时间',
  `paid_at` DATETIME(3) NULL COMMENT '支付时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_renewal_order_id` (`order_id`),
  KEY `idx_renewal_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='续租申请表';

DROP TABLE IF EXISTS `invoice`;
CREATE TABLE `invoice` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '发票ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `order_id` INT NOT NULL COMMENT '关联订单ID',
  `title_id` INT NOT NULL COMMENT '抬头ID',
  `invoice_type` ENUM('ELECTRONIC_NORMAL','PAPER_NORMAL','ELECTRONIC_SPECIAL','PAPER_SPECIAL') NOT NULL DEFAULT 'ELECTRONIC_NORMAL' COMMENT '发票类型',
  `amount_cents` BIGINT NOT NULL COMMENT '发票金额(分)',
  `status` ENUM('PENDING','ISSUED','DELIVERED','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING' COMMENT '状态',
  `invoice_no` VARCHAR(50) NULL COMMENT '发票号码',
  `issued_at` DATETIME(3) NULL COMMENT '开票时间',
  `mail_tracking_no` VARCHAR(100) NULL COMMENT '邮寄跟踪号',
  `fail_reason` TEXT NULL COMMENT '失败原因',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_invoice_user_id` (`user_id`),
  KEY `idx_invoice_order_id` (`order_id`),
  KEY `idx_invoice_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='发票记录表';

DROP TABLE IF EXISTS `invoice_title`;
CREATE TABLE `invoice_title` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '抬头ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `title_type` ENUM('PERSONAL','COMPANY') NOT NULL DEFAULT 'PERSONAL' COMMENT '抬头类型',
  `title_name` VARCHAR(128) NOT NULL COMMENT '抬头名称',
  `tax_no` VARCHAR(30) NULL COMMENT '税号',
  `address` VARCHAR(255) NULL COMMENT '地址',
  `phone` VARCHAR(20) NULL COMMENT '电话',
  `bank_name` VARCHAR(128) NULL COMMENT '开户银行',
  `bank_account` VARCHAR(50) NULL COMMENT '银行账号',
  `is_default` TINYINT NOT NULL DEFAULT 0 COMMENT '是否默认',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_invoice_title_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='发票抬头表';

-- ============================================================
-- 11. 收藏/反馈模块
-- ============================================================

DROP TABLE IF EXISTS `favorites`;
CREATE TABLE `favorites` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '收藏ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `vehicle_id` BIGINT NOT NULL COMMENT '车辆ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '收藏时间',
  PRIMARY KEY (`id`),
  KEY `idx_favorites_user_id` (`user_id`),
  KEY `idx_favorites_vehicle_id` (`vehicle_id`),
  UNIQUE KEY `uk_favorites_user_vehicle` (`user_id`, `vehicle_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收藏表';

DROP TABLE IF EXISTS `feedbacks`;
CREATE TABLE `feedbacks` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '反馈ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `category` ENUM('FEATURE_SUGGESTION','BUG_REPORT','COMPLAINT','OTHER') NOT NULL COMMENT '分类',
  `content` TEXT NOT NULL COMMENT '反馈内容',
  `images` JSON NULL COMMENT '图片列表',
  `contact_phone` VARCHAR(20) NULL COMMENT '联系手机',
  `contact_email` VARCHAR(100) NULL COMMENT '联系邮箱',
  `status` ENUM('PENDING','PROCESSING','RESOLVED','CLOSED') NOT NULL DEFAULT 'PENDING' COMMENT '处理状态',
  `staff_reply` TEXT NULL COMMENT '客服回复',
  `replied_at` DATETIME(3) NULL COMMENT '回复时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_feedbacks_user_id` (`user_id`),
  KEY `idx_feedbacks_status` (`status`),
  KEY `idx_feedbacks_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='反馈表';

-- ============================================================
-- 12. 营销活动模块
-- ============================================================

DROP TABLE IF EXISTS `activities`;
CREATE TABLE `activities` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '活动ID',
  `name` VARCHAR(100) NOT NULL COMMENT '活动名称',
  `type` ENUM('LIMITED_DISCOUNT','FULL_REDUCTION','NEW_USER','INVITE','FLASH_SALE') NOT NULL COMMENT '活动类型',
  `status` ENUM('DRAFT','PENDING','ACTIVE','ENDED','CANCELLED') NOT NULL DEFAULT 'DRAFT' COMMENT '状态',
  `description` TEXT NULL COMMENT '活动描述',
  `cover_image` VARCHAR(500) NULL COMMENT '封面图',
  `start_time` DATETIME(3) NOT NULL COMMENT '开始时间',
  `end_time` DATETIME(3) NOT NULL COMMENT '结束时间',
  `rules` JSON NOT NULL COMMENT '活动规则JSON',
  `quota` INT NOT NULL DEFAULT 0 COMMENT '发放总量',
  `used_count` INT NOT NULL DEFAULT 0 COMMENT '已使用量',
  `participant_count` INT NOT NULL DEFAULT 0 COMMENT '参与人数',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_activities_status` (`status`),
  KEY `idx_activities_start_end` (`start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动表';

DROP TABLE IF EXISTS `discount_rules`;
CREATE TABLE `discount_rules` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '规则ID',
  `activity_id` INT NOT NULL COMMENT '活动ID',
  `rule_type` ENUM('PERCENT','FIXED','GRADIENT') NOT NULL COMMENT '规则类型',
  `min_amount_cents` BIGINT NOT NULL DEFAULT 0 COMMENT '最低金额(分)',
  `discount_value` DECIMAL(10, 2) NOT NULL COMMENT '优惠值',
  `max_discount_cents` BIGINT NULL COMMENT '最大优惠(分)',
  `vehicle_model_ids` JSON NULL COMMENT '适用车型列表',
  `store_ids` JSON NULL COMMENT '适用门店列表',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_discount_rules_activity_id` (`activity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='优惠规则表';

DROP TABLE IF EXISTS `flash_sales`;
CREATE TABLE `flash_sales` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '秒杀ID',
  `activity_id` INT NOT NULL COMMENT '活动ID',
  `vehicle_model_id` INT NOT NULL COMMENT '车型ID',
  `flash_price_cents` BIGINT NOT NULL COMMENT '秒杀价(分)',
  `stock` INT NOT NULL COMMENT '秒杀库存',
  `sold_count` INT NOT NULL DEFAULT 0 COMMENT '已售量',
  `start_time` DATETIME(3) NOT NULL COMMENT '开始时间',
  `end_time` DATETIME(3) NOT NULL COMMENT '结束时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_flash_sales_activity_id` (`activity_id`),
  KEY `idx_flash_sales_start_end` (`start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='秒杀表';

DROP TABLE IF EXISTS `invitations`;
CREATE TABLE `invitations` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '邀请ID',
  `inviter_id` INT NOT NULL COMMENT '邀请人ID',
  `invitee_id` INT NULL COMMENT '被邀请人ID',
  `invite_code` VARCHAR(16) NOT NULL COMMENT '邀请码',
  `status` ENUM('PENDING','REGISTERED','REWARDED') NOT NULL DEFAULT 'PENDING' COMMENT '状态',
  `reward_type` VARCHAR(32) NULL COMMENT '奖励类型',
  `reward_value` INT NULL COMMENT '奖励值',
  `rewarded_at` DATETIME(3) NULL COMMENT '奖励发放时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_invitations_code` (`invite_code`),
  KEY `idx_invitations_inviter_id` (`inviter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邀请记录表';

-- ============================================================
-- 13. 数据分析模块
-- ============================================================

DROP TABLE IF EXISTS `analytics_daily`;
CREATE TABLE `analytics_daily` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `date` DATE NOT NULL COMMENT '统计日期',
  `total_orders` INT NOT NULL DEFAULT 0 COMMENT '订单数',
  `completed_orders` INT NOT NULL DEFAULT 0 COMMENT '完成订单数',
  `cancelled_orders` INT NOT NULL DEFAULT 0 COMMENT '取消订单数',
  `revenue_cents` BIGINT NOT NULL DEFAULT 0 COMMENT '收入(分)',
  `refund_cents` BIGINT NOT NULL DEFAULT 0 COMMENT '退款(分)',
  `new_users` INT NOT NULL DEFAULT 0 COMMENT '新增用户',
  `active_users` INT NOT NULL DEFAULT 0 COMMENT '活跃用户',
  `avg_order_amount_cents` BIGINT NOT NULL DEFAULT 0 COMMENT '平均客单价(分)',
  `vehicle_utilization_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0 COMMENT '车辆利用率%',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_analytics_daily_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日统计表';

DROP TABLE IF EXISTS `analytics_weekly`;
CREATE TABLE `analytics_weekly` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `year` INT NOT NULL COMMENT '年份',
  `week` INT NOT NULL COMMENT '周数',
  `total_orders` INT NOT NULL DEFAULT 0 COMMENT '订单数',
  `revenue_cents` BIGINT NOT NULL DEFAULT 0 COMMENT '收入(分)',
  `new_users` INT NOT NULL DEFAULT 0 COMMENT '新增用户',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_analytics_weekly_year_week` (`year`, `week`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每周统计表';

DROP TABLE IF EXISTS `analytics_monthly`;
CREATE TABLE `analytics_monthly` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `year` INT NOT NULL COMMENT '年份',
  `month` INT NOT NULL COMMENT '月份',
  `total_orders` INT NOT NULL DEFAULT 0 COMMENT '订单数',
  `revenue_cents` BIGINT NOT NULL DEFAULT 0 COMMENT '收入(分)',
  `new_users` INT NOT NULL DEFAULT 0 COMMENT '新增用户',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_analytics_monthly_year_month` (`year`, `month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每月统计表';

-- ============================================================
-- 14. GPS轨迹模块
-- ============================================================

DROP TABLE IF EXISTS `gps_points`;
CREATE TABLE `gps_points` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '轨迹点ID',
  `vehicle_id` BIGINT NOT NULL COMMENT '车辆ID',
  `order_id` BIGINT NULL COMMENT '关联订单ID',
  `longitude` DECIMAL(10, 6) NOT NULL COMMENT '经度(GCJ02)',
  `latitude` DECIMAL(10, 6) NOT NULL COMMENT '纬度(GCJ02)',
  `speed` DECIMAL(8, 2) NOT NULL DEFAULT 0 COMMENT '速度(km/h)',
  `heading` DECIMAL(5, 1) NOT NULL DEFAULT 0 COMMENT '方向角(0-359)',
  `accuracy` DECIMAL(8, 2) NULL COMMENT '定位精度(米)',
  `altitude` DECIMAL(8, 2) NULL COMMENT '海拔(米)',
  `odometer` BIGINT NULL COMMENT '里程表读数(米)',
  `battery_level` INT NULL COMMENT '电量百分比(0-100)',
  `source` VARCHAR(16) NOT NULL COMMENT '数据来源 tbox/app/ble/manual',
  `timestamp` DATETIME(3) NOT NULL COMMENT '上报时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_gps_points_vehicle_id` (`vehicle_id`),
  KEY `idx_gps_points_timestamp` (`timestamp`),
  KEY `idx_gps_points_vehicle_timestamp` (`vehicle_id`, `timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GPS轨迹点表';

-- ============================================================
-- 15. 运维模块 (审计/操作/异常)
-- ============================================================

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `user_id` INT NULL COMMENT '操作用户ID',
  `staff_id` INT NULL COMMENT '操作员工ID',
  `action` VARCHAR(64) NOT NULL COMMENT '操作类型',
  `resource` VARCHAR(64) NOT NULL COMMENT '资源类型',
  `resource_id` INT NULL COMMENT '资源ID',
  `detail` JSON NULL COMMENT '操作详情',
  `ip` VARCHAR(64) NULL COMMENT 'IP地址',
  `user_agent` VARCHAR(512) NULL COMMENT 'UA',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_user_id` (`user_id`),
  KEY `idx_audit_logs_action` (`action`),
  KEY `idx_audit_logs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审计日志表';

DROP TABLE IF EXISTS `exception_logs`;
CREATE TABLE `exception_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '异常ID',
  `exception_type` VARCHAR(128) NOT NULL COMMENT '异常类型',
  `message` TEXT NOT NULL COMMENT '异常信息',
  `stack_trace` TEXT NULL COMMENT '堆栈跟踪',
  `context` JSON NULL COMMENT '上下文信息',
  `severity` ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM' COMMENT '严重程度',
  `status` ENUM('OPEN','RESOLVED','IGNORED') NOT NULL DEFAULT 'OPEN' COMMENT '处理状态',
  `resolved_by` INT NULL COMMENT '处理人',
  `resolved_at` DATETIME(3) NULL COMMENT '处理时间',
  `resolution_note` TEXT NULL COMMENT '处理说明',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_exception_logs_type` (`exception_type`),
  KEY `idx_exception_logs_status` (`status`),
  KEY `idx_exception_logs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='异常日志表';

DROP TABLE IF EXISTS `vehicle_transfers`;
CREATE TABLE `vehicle_transfers` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '调配ID',
  `vehicle_id` INT NOT NULL COMMENT '车辆ID',
  `from_store_id` INT NOT NULL COMMENT '调出门店',
  `to_store_id` INT NOT NULL COMMENT '调入门店',
  `transfer_type` ENUM('SCHEDULED','URGENT','BATCH') NOT NULL DEFAULT 'SCHEDULED' COMMENT '调配类型',
  `status` ENUM('PENDING','IN_TRANSIT','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING' COMMENT '状态',
  `requested_by` INT NULL COMMENT '申请人',
  `approved_by` INT NULL COMMENT '审批人',
  `transporter` VARCHAR(64) NULL COMMENT '运输人',
  `transport_cost_cents` BIGINT NULL COMMENT '运输费用(分)',
  `estimated_arrival_at` DATETIME(3) NULL COMMENT '预计到达时间',
  `actual_arrival_at` DATETIME(3) NULL COMMENT '实际到达时间',
  `remark` TEXT NULL COMMENT '备注',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_vehicle_transfers_vehicle_id` (`vehicle_id`),
  KEY `idx_vehicle_transfers_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='车辆调配表';

DROP TABLE IF EXISTS `message_templates`;
CREATE TABLE `message_templates` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '模板ID',
  `template_code` VARCHAR(64) NOT NULL COMMENT '模板编码',
  `template_name` VARCHAR(128) NOT NULL COMMENT '模板名称',
  `channel` VARCHAR(32) NOT NULL DEFAULT 'SMS' COMMENT '渠道 SMS/MINI_SUBSCRIBE/IN_APP',
  `title_template` VARCHAR(256) NULL COMMENT '标题模板',
  `content_template` TEXT NOT NULL COMMENT '内容模板',
  `variables` JSON NULL COMMENT '变量说明',
  `is_active` TINYINT NOT NULL DEFAULT 1 COMMENT '状态 0停用/1启用',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_message_templates_code` (`template_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息模板表';

-- ============================================================
-- 15. 种子数据
-- ============================================================

-- 会员等级
INSERT INTO `user_levels` (`id`, `level_code`, `level_name`, `level`, `min_growth_value`, `max_growth_value`, `benefits`, `status`, `sort_order`) VALUES
(1, 'BRONZE',   '青铜会员', 1,     0,   999, '{"discount":1.00,"points_multiplier":1.0,"coupon_count":0}', 1, 1),
(2, 'SILVER',   '白银会员', 2,  1000,  4999, '{"discount":0.98,"points_multiplier":1.2,"coupon_count":1}', 1, 2),
(3, 'GOLD',     '黄金会员', 3,  5000, 19999, '{"discount":0.95,"points_multiplier":1.5,"coupon_count":2}', 1, 3),
(4, 'PLATINUM', '铂金会员', 4, 20000, 49999, '{"discount":0.90,"points_multiplier":2.0,"coupon_count":3}', 1, 4),
(5, 'DIAMOND',  '钻石会员', 5, 50000,  NULL, '{"discount":0.85,"points_multiplier":3.0,"coupon_count":5}', 1, 5);

-- 默认角色
INSERT INTO `roles` (`id`, `role_name`, `role_code`, `description`, `is_active`) VALUES
(1, '超级管理员', 'SUPER_ADMIN', '系统最高权限', 1),
(2, '门店管理员', 'STORE_ADMIN', '管理所属门店的车辆/订单/员工', 1),
(3, '客服人员', 'CUSTOMER_SERVICE', '处理工单/投诉/评价', 1),
(4, '财务人员', 'FINANCE', '查看财务报表/对账/发票', 1),
(5, '运营人员', 'OPERATION', '活动配置/数据分析/消息推送', 1);

-- 默认权限
INSERT INTO `permissions` (`id`, `permission_code`, `permission_name`, `resource`, `action`, `module`) VALUES
(1, 'dashboard:view',     '查看仪表盘',     'dashboard', 'view', 'dashboard'),
(2, 'order:view',         '查看订单',       'order',     'view', 'order'),
(3, 'order:edit',         '编辑订单',       'order',     'edit', 'order'),
(4, 'vehicle:view',       '查看车辆',       'vehicle',   'view', 'vehicle'),
(5, 'vehicle:edit',       '编辑车辆',       'vehicle',   'edit', 'vehicle'),
(6, 'store:view',         '查看门店',       'store',     'view', 'store'),
(7, 'store:edit',         '编辑门店',       'store',     'edit', 'store'),
(8, 'staff:view',         '查看员工',       'staff',     'view', 'staff'),
(9, 'staff:edit',         '编辑员工',       'staff',     'edit', 'staff'),
(10, 'finance:view',      '查看财务',       'finance',   'view', 'finance'),
(11, 'coupon:view',       '查看优惠券',     'coupon',    'view', 'coupon'),
(12, 'coupon:edit',       '编辑优惠券',     'coupon',    'edit', 'coupon'),
(13, 'ticket:view',       '查看工单',       'ticket',    'view', 'ticket'),
(14, 'ticket:edit',       '处理工单',       'ticket',    'edit', 'ticket'),
(15, 'system:config',     '系统配置',       'system',    'config', 'system');

-- 超级管理员拥有所有权限
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(1,9),(1,10),(1,11),(1,12),(1,13),(1,14),(1,15);

-- 默认管理员账号: admin / Gy@2026init (bcrypt hash)
INSERT INTO `staff` (`staff_no`, `account`, `password_hash`, `real_name`, `phone`, `status`)
VALUES ('GY001', 'admin', '$2a$10$EixZaYVK1fsbw1ZfbX3OXe.P0GGiqOQJmT7FmLiVBxv.WJtKaHvDq', '系统管理员', '13800000000', 0);

-- 默认管理员角色
INSERT INTO `staff_roles` (`staff_id`, `role_id`) VALUES (1, 1);

-- ============================================================
-- 性能优化索引 (补充)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orders_user_status_created ON orders(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_vehicle_status_created ON orders(vehicle_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_store_pickup ON orders(pickup_store_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_order_created ON payments(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_coupons_expire ON user_coupons(status, expire_time);
CREATE INDEX IF NOT EXISTS idx_message_logs_user_read ON message_logs(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_vehicle_status ON reviews(vehicle_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority_status ON tickets(priority, status);
CREATE INDEX IF NOT EXISTS idx_favorites_user_created ON favorites(user_id, created_at DESC);
