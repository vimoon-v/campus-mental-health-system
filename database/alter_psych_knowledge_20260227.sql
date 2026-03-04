ALTER TABLE `psych_knowledge`
    ADD COLUMN `summary` varchar(512) DEFAULT NULL COMMENT '文章摘要',
    ADD COLUMN `tags` text DEFAULT NULL COMMENT '文章标签（逗号分隔）',
    ADD COLUMN `cover_image` mediumtext DEFAULT NULL COMMENT '封面图片（Base64或URL）',
    ADD COLUMN `publish_status` varchar(16) NOT NULL DEFAULT 'publish' COMMENT '发布状态：publish/schedule/draft',
    ADD COLUMN `schedule_time` datetime DEFAULT NULL COMMENT '定时发布时间',
    ADD COLUMN `visible_range` varchar(16) NOT NULL DEFAULT 'all' COMMENT '可见范围',
    ADD COLUMN `allow_comment` tinyint(1) NOT NULL DEFAULT 1 COMMENT '允许评论',
    ADD COLUMN `recommended` tinyint(1) NOT NULL DEFAULT 0 COMMENT '推荐文章';
