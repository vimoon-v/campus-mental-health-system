USE `UCAACP`;

-- 1) 清理历史重复举报（同一用户对同一帖子只保留最早一条）
DELETE pr_dup
FROM `post_report` pr_dup
JOIN `post_report` pr_keep
  ON pr_dup.`post_id` = pr_keep.`post_id`
 AND pr_dup.`reporter_username` = pr_keep.`reporter_username`
 AND pr_dup.`report_id` > pr_keep.`report_id`
WHERE pr_dup.`reporter_username` IS NOT NULL;

-- 2) 如果唯一键不存在则补齐
SET @idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'post_report'
    AND INDEX_NAME = 'uk_post_report_post_reporter'
);

SET @ddl := IF(
  @idx_exists = 0,
  'ALTER TABLE `post_report` ADD UNIQUE KEY `uk_post_report_post_reporter` (`post_id`,`reporter_username`)',
  'SELECT ''uk_post_report_post_reporter already exists'''
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

