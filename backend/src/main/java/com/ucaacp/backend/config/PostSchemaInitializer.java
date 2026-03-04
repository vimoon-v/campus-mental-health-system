package com.ucaacp.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class PostSchemaInitializer {

    private static final Logger log = LoggerFactory.getLogger(PostSchemaInitializer.class);

    private final JdbcTemplate jdbcTemplate;

    public PostSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensurePostOptionColumns() {
        try {
            if (!tableExists("post")) {
                log.warn("表 post 不存在，跳过匿名倾诉字段补齐");
                return;
            }
            addColumnIfMissing(
                    "post",
                    "need_reply",
                    "TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否希望老师优先回复（0：否，1：是）'"
            );
            addColumnIfMissing(
                    "post",
                    "allow_comment",
                    "TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否允许评论（0：否，1：是）'"
            );
            addColumnIfMissing(
                    "post",
                    "show_in_recommend",
                    "TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否展示在推荐列表（0：否，1：是）'"
            );
            addColumnIfMissing(
                    "post",
                    "anonymous_like",
                    "TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否匿名接收点赞（0：否，1：是）'"
            );
        } catch (Exception e) {
            log.error("补齐 post 表新字段失败: {}", e.getMessage(), e);
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

