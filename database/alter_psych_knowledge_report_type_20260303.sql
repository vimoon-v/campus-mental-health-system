-- 为 psych_knowledge_report 增加举报类型字段，并修正历史非法值

SET @db := DATABASE();

SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME = 'psych_knowledge_report'
      AND COLUMN_NAME = 'report_type'
);

SET @ddl := IF(
    @column_exists = 0,
    "ALTER TABLE `psych_knowledge_report` ADD COLUMN `report_type` VARCHAR(20) NOT NULL DEFAULT '其他' COMMENT '举报类型：内容违规/广告推广/人身攻击/隐私泄露/其他' AFTER `report_reason`",
    "SELECT 'psych_knowledge_report.report_type already exists'"
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `psych_knowledge_report`
SET `report_type` = '其他'
WHERE `report_type` IS NULL
   OR TRIM(`report_type`) = ''
   OR `report_type` NOT IN ('内容违规','广告推广','人身攻击','隐私泄露','其他');

