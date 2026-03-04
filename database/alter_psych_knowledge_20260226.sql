ALTER TABLE `psych_knowledge`
    ADD COLUMN `category` varchar(32) NOT NULL DEFAULT 'growth' COMMENT '科普分类（如情绪管理/压力应对等）' AFTER `content`,
    ADD COLUMN `view_count` int NOT NULL DEFAULT 0 COMMENT '阅读量' AFTER `category`;
