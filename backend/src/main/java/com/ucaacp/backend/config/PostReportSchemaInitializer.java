package com.ucaacp.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class PostReportSchemaInitializer {

    private static final Logger log = LoggerFactory.getLogger(PostReportSchemaInitializer.class);

    private final JdbcTemplate jdbcTemplate;

    public PostReportSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensurePostReportUniqueConstraint() {
        try {
            if (!tableExists("post_report")) {
                log.warn("表 post_report 不存在，跳过举报唯一键补齐");
                return;
            }
            addColumnIfMissing(
                    "post_report",
                    "report_type",
                    "VARCHAR(20) NOT NULL DEFAULT '其他' COMMENT '举报类型：内容违规/广告推广/人身攻击/隐私泄露/其他'"
            );
            normalizeReportType();
            removeDuplicateReports();
            addUniqueIndexIfMissing("post_report", "uk_post_report_post_reporter", "(`post_id`,`reporter_username`)");
        } catch (Exception e) {
            log.error("补齐 post_report 唯一键失败: {}", e.getMessage(), e);
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

    private boolean indexExists(String tableName, String indexName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?",
                Integer.class,
                tableName,
                indexName
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

    private void normalizeReportType() {
        String sql = "UPDATE `post_report` " +
                "SET `report_type` = '其他' " +
                "WHERE `report_type` IS NULL " +
                "   OR TRIM(`report_type`) = '' " +
                "   OR `report_type` NOT IN ('内容违规','广告推广','人身攻击','隐私泄露','其他')";
        int updated = jdbcTemplate.update(sql);
        if (updated > 0) {
            log.warn("已修正 post_report 非法举报类型: {} 条", updated);
        }
    }

    private void removeDuplicateReports() {
        String sql = "DELETE pr_dup " +
                "FROM `post_report` pr_dup " +
                "JOIN `post_report` pr_keep " +
                "  ON pr_dup.`post_id` = pr_keep.`post_id` " +
                " AND pr_dup.`reporter_username` = pr_keep.`reporter_username` " +
                " AND pr_dup.`report_id` > pr_keep.`report_id` " +
                "WHERE pr_dup.`reporter_username` IS NOT NULL";
        int removed = jdbcTemplate.update(sql);
        if (removed > 0) {
            log.warn("已清理 post_report 历史重复举报记录: {} 条", removed);
        }
    }

    private void addUniqueIndexIfMissing(String tableName, String indexName, String columnsSql) {
        if (indexExists(tableName, indexName)) {
            return;
        }
        String sql = String.format("ALTER TABLE `%s` ADD UNIQUE KEY `%s` %s", tableName, indexName, columnsSql);
        jdbcTemplate.execute(sql);
        log.info("已补齐唯一键: {}.{} {}", tableName, indexName, columnsSql);
    }
}
