USE `UCAACP`;

-- 1) 如果字段不存在则补齐
SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'post_report'
    AND COLUMN_NAME = 'report_type'
);

SET @ddl := IF(
  @col_exists = 0,
  "ALTER TABLE `post_report` ADD COLUMN `report_type` VARCHAR(20) NOT NULL DEFAULT '其他' COMMENT '举报类型：内容违规/广告推广/人身攻击/隐私泄露/其他' AFTER `report_reason`",
  "SELECT 'post_report.report_type already exists'"
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) 修正历史空值/非法值
UPDATE `post_report`
SET `report_type` = '其他'
WHERE `report_type` IS NULL
   OR TRIM(`report_type`) = ''
   OR `report_type` NOT IN ('内容违规','广告推广','人身攻击','隐私泄露','其他');

