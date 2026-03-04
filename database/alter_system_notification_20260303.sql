-- 新增系统通知表（若不存在）

CREATE TABLE IF NOT EXISTS `system_notification` (
    `notification_id` INT NOT NULL AUTO_INCREMENT COMMENT '通知ID',
    `recipient_username` VARCHAR(45) NOT NULL COMMENT '接收者用户名',
    `sender_username` VARCHAR(45) DEFAULT NULL COMMENT '发送者用户名',
    `notification_type` VARCHAR(32) NOT NULL COMMENT '通知类型',
    `title` VARCHAR(120) NOT NULL COMMENT '通知标题',
    `content` TEXT NOT NULL COMMENT '通知内容',
    `related_type` VARCHAR(32) DEFAULT NULL COMMENT '关联业务类型',
    `related_id` INT DEFAULT NULL COMMENT '关联业务ID',
    `is_read` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已读（0未读，1已读）',
    `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`notification_id`),
    KEY `idx_notification_recipient` (`recipient_username`),
    KEY `idx_notification_read` (`recipient_username`,`is_read`),
    KEY `idx_notification_time` (`created_time`),
    CONSTRAINT `fk_notification_recipient` FOREIGN KEY (`recipient_username`) REFERENCES `user` (`username`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_notification_sender` FOREIGN KEY (`sender_username`) REFERENCES `user` (`username`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统通知表';

