-- 统一心理科普历史标签到前端标准标签池
-- 标准标签（与前端一致）：
-- 情绪调节, 焦虑, 抑郁, 自信, 沟通技巧, 时间管理, 正念, 冥想, 自我接纳, 压力管理, 社交恐惧, 拖延症
--
-- 使用方式：
-- 1) 先执行「备份 + 预览」
-- 2) 确认无误后执行「更新」
-- 3) 如需回滚，执行文末「回滚SQL」

SET NAMES utf8mb4;

-- 1) 备份当前 tags（可重复执行，按 knowledge_id 覆盖）
CREATE TABLE IF NOT EXISTS `psych_knowledge_tags_backup_20260303` (
    `knowledge_id` int NOT NULL,
    `old_tags` text DEFAULT NULL,
    `backup_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`knowledge_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='psych_knowledge.tags 归一化前备份';

REPLACE INTO `psych_knowledge_tags_backup_20260303` (`knowledge_id`, `old_tags`, `backup_time`)
SELECT `knowledge_id`, `tags`, NOW()
FROM `psych_knowledge`;

-- 2) 预览：查看将要变化的记录（先看这段结果）
SELECT
    p.`knowledge_id`,
    p.`title`,
    p.`tags` AS `old_tags`,
    n.`normalized_tags` AS `new_tags`
FROM `psych_knowledge` p
JOIN (
    SELECT
        s.`knowledge_id`,
        COALESCE(
            NULLIF(
                SUBSTRING_INDEX(
                    CONCAT_WS(',',
                        IF(REGEXP_LIKE(s.`src`, '情绪|心情|烦躁|易怒|情感'), '情绪调节', NULL),
                        IF(REGEXP_LIKE(s.`src`, '焦虑|紧张|担心|恐惧|anxiety'), '焦虑', NULL),
                        IF(REGEXP_LIKE(s.`src`, '抑郁|低落|沮丧|无助|depress'), '抑郁', NULL),
                        IF(REGEXP_LIKE(s.`src`, '自信|自卑|自我价值|价值感'), '自信', NULL),
                        IF(REGEXP_LIKE(s.`src`, '沟通|表达|倾听|冲突|人际|社交技巧'), '沟通技巧', NULL),
                        IF(REGEXP_LIKE(s.`src`, '时间管理|计划|效率|专注|番茄|拖延'), '时间管理', NULL),
                        IF(REGEXP_LIKE(s.`src`, '正念|mindful'), '正念', NULL),
                        IF(REGEXP_LIKE(s.`src`, '冥想|呼吸练习|meditat'), '冥想', NULL),
                        IF(REGEXP_LIKE(s.`src`, '自我接纳|接纳自己|自我认同'), '自我接纳', NULL),
                        IF(REGEXP_LIKE(s.`src`, '压力|应激|倦怠|负担|burnout|stress'), '压力管理', NULL),
                        IF(REGEXP_LIKE(s.`src`, '社交恐惧|社恐|社交焦虑'), '社交恐惧', NULL),
                        IF(REGEXP_LIKE(s.`src`, '拖延症|拖延|procrast'), '拖延症', NULL)
                    ),
                    ',', 5
                ),
                ''
            ),
            '情绪调节'
        ) AS `normalized_tags`
    FROM (
        SELECT
            `knowledge_id`,
            LOWER(CONCAT_WS(' ',
                COALESCE(`title`, ''),
                COALESCE(`content`, ''),
                COALESCE(`tags`, ''),
                COALESCE(`category`, '')
            )) AS `src`
        FROM `psych_knowledge`
    ) s
) n ON n.`knowledge_id` = p.`knowledge_id`
WHERE COALESCE(p.`tags`, '') <> COALESCE(n.`normalized_tags`, '')
ORDER BY p.`knowledge_id` DESC;

-- 3) 正式更新（确认预览结果后再执行）
UPDATE `psych_knowledge` p
JOIN (
    SELECT
        s.`knowledge_id`,
        COALESCE(
            NULLIF(
                SUBSTRING_INDEX(
                    CONCAT_WS(',',
                        IF(REGEXP_LIKE(s.`src`, '情绪|心情|烦躁|易怒|情感'), '情绪调节', NULL),
                        IF(REGEXP_LIKE(s.`src`, '焦虑|紧张|担心|恐惧|anxiety'), '焦虑', NULL),
                        IF(REGEXP_LIKE(s.`src`, '抑郁|低落|沮丧|无助|depress'), '抑郁', NULL),
                        IF(REGEXP_LIKE(s.`src`, '自信|自卑|自我价值|价值感'), '自信', NULL),
                        IF(REGEXP_LIKE(s.`src`, '沟通|表达|倾听|冲突|人际|社交技巧'), '沟通技巧', NULL),
                        IF(REGEXP_LIKE(s.`src`, '时间管理|计划|效率|专注|番茄|拖延'), '时间管理', NULL),
                        IF(REGEXP_LIKE(s.`src`, '正念|mindful'), '正念', NULL),
                        IF(REGEXP_LIKE(s.`src`, '冥想|呼吸练习|meditat'), '冥想', NULL),
                        IF(REGEXP_LIKE(s.`src`, '自我接纳|接纳自己|自我认同'), '自我接纳', NULL),
                        IF(REGEXP_LIKE(s.`src`, '压力|应激|倦怠|负担|burnout|stress'), '压力管理', NULL),
                        IF(REGEXP_LIKE(s.`src`, '社交恐惧|社恐|社交焦虑'), '社交恐惧', NULL),
                        IF(REGEXP_LIKE(s.`src`, '拖延症|拖延|procrast'), '拖延症', NULL)
                    ),
                    ',', 5
                ),
                ''
            ),
            '情绪调节'
        ) AS `normalized_tags`
    FROM (
        SELECT
            `knowledge_id`,
            LOWER(CONCAT_WS(' ',
                COALESCE(`title`, ''),
                COALESCE(`content`, ''),
                COALESCE(`tags`, ''),
                COALESCE(`category`, '')
            )) AS `src`
        FROM `psych_knowledge`
    ) s
) n ON n.`knowledge_id` = p.`knowledge_id`
SET p.`tags` = n.`normalized_tags`;

-- 4) 更新后检查
SELECT
    `tags`,
    COUNT(*) AS `cnt`
FROM `psych_knowledge`
GROUP BY `tags`
ORDER BY `cnt` DESC, `tags` ASC;

-- 回滚SQL（如需回退）：
-- UPDATE `psych_knowledge` p
-- JOIN `psych_knowledge_tags_backup_20260303` b ON b.`knowledge_id` = p.`knowledge_id`
-- SET p.`tags` = b.`old_tags`;

