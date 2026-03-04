CREATE TABLE IF NOT EXISTS `school` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `province_name` VARCHAR(20) NOT NULL COMMENT '省份名称',
  `school_name` VARCHAR(120) NOT NULL COMMENT '学校名称',
  `school_code` VARCHAR(20) NOT NULL COMMENT '学校标识码',
  `department` VARCHAR(60) DEFAULT NULL COMMENT '主管部门',
  `location` VARCHAR(40) DEFAULT NULL COMMENT '所在地',
  `level` VARCHAR(20) DEFAULT NULL COMMENT '办学层次',
  `remark` VARCHAR(120) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_school` (`province_name`, `school_name`),
  KEY `idx_school_province` (`province_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='高校名单';
