ALTER TABLE `reply`
    ADD COLUMN `parent_reply_id` INT NULL COMMENT '父评论ID（为空表示直接回复帖子）' AFTER `username`;

ALTER TABLE `reply`
    ADD INDEX `fk_reply_parent` (`parent_reply_id`);

ALTER TABLE `reply`
    ADD CONSTRAINT `fk_reply_parent`
    FOREIGN KEY (`parent_reply_id`) REFERENCES `reply` (`reply_id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
