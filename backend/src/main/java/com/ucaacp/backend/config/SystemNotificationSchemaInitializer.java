package com.ucaacp.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class SystemNotificationSchemaInitializer {

    private static final Logger log = LoggerFactory.getLogger(SystemNotificationSchemaInitializer.class);
    private final JdbcTemplate jdbcTemplate;

    public SystemNotificationSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureTable() {
        try {
            if (tableExists("system_notification")) {
                return;
            }
            jdbcTemplate.execute(
                    "CREATE TABLE `system_notification` (" +
                            "`notification_id` INT NOT NULL AUTO_INCREMENT COMMENT '通知ID'," +
                            "`recipient_username` VARCHAR(45) NOT NULL COMMENT '接收者用户名'," +
                            "`sender_username` VARCHAR(45) DEFAULT NULL COMMENT '发送者用户名'," +
                            "`notification_type` VARCHAR(32) NOT NULL COMMENT '通知类型'," +
                            "`title` VARCHAR(120) NOT NULL COMMENT '通知标题'," +
                            "`content` TEXT NOT NULL COMMENT '通知内容'," +
                            "`related_type` VARCHAR(32) DEFAULT NULL COMMENT '关联业务类型'," +
                            "`related_id` INT DEFAULT NULL COMMENT '关联业务ID'," +
                            "`is_read` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已读'," +
                            "`created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'," +
                            "PRIMARY KEY (`notification_id`)," +
                            "KEY `idx_notification_recipient` (`recipient_username`)," +
                            "KEY `idx_notification_read` (`recipient_username`,`is_read`)," +
                            "KEY `idx_notification_time` (`created_time`)," +
                            "CONSTRAINT `fk_notification_recipient` FOREIGN KEY (`recipient_username`) REFERENCES `user` (`username`) ON DELETE CASCADE ON UPDATE CASCADE," +
                            "CONSTRAINT `fk_notification_sender` FOREIGN KEY (`sender_username`) REFERENCES `user` (`username`) ON DELETE SET NULL ON UPDATE CASCADE" +
                            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统通知表'"
            );
            log.info("已创建表 system_notification");
        } catch (Exception e) {
            log.error("初始化 system_notification 失败: {}", e.getMessage(), e);
        }
    }

    private boolean tableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
                Integer.class,
                tableName
        );
        return count != null && count > 0;
    }
}

