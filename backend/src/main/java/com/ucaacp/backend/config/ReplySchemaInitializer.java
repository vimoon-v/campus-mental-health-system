package com.ucaacp.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class ReplySchemaInitializer {

    private static final Logger log = LoggerFactory.getLogger(ReplySchemaInitializer.class);

    private final JdbcTemplate jdbcTemplate;

    public ReplySchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureReplyParentColumn() {
        try {
            if (!tableExists("reply")) {
                log.warn("表 reply 不存在，跳过回复父评论字段补齐");
                return;
            }
            addColumnIfMissing(
                    "reply",
                    "parent_reply_id",
                    "INT NULL COMMENT '父评论ID（为空表示直接回复帖子）'"
            );
        } catch (Exception e) {
            log.error("补齐 reply.parent_reply_id 字段失败: {}", e.getMessage(), e);
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

    private boolean columnExists(String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
                Integer.class,
                tableName,
                columnName
        );
        return count != null && count > 0;
    }

    private void addColumnIfMissing(String tableName, String columnName, String definition) {
        if (columnExists(tableName, columnName)) {
            return;
        }
        String sql = String.format("ALTER TABLE `%s` ADD COLUMN `%s` %s", tableName, columnName, definition);
        jdbcTemplate.execute(sql);
        log.info("已补齐字段: {}.{}", tableName, columnName);
    }
}

