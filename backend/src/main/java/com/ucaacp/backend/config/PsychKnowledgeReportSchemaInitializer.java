package com.ucaacp.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class PsychKnowledgeReportSchemaInitializer {

    private static final Logger log = LoggerFactory.getLogger(PsychKnowledgeReportSchemaInitializer.class);
    private final JdbcTemplate jdbcTemplate;

    public PsychKnowledgeReportSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureReportTypeColumn() {
        try {
            if (!tableExists("psych_knowledge_report")) {
                log.warn("表 psych_knowledge_report 不存在，跳过举报类型补齐");
                return;
            }
            addColumnIfMissing(
                    "psych_knowledge_report",
                    "report_type",
                    "VARCHAR(20) NOT NULL DEFAULT '其他' COMMENT '举报类型：内容违规/广告推广/人身攻击/隐私泄露/其他'"
            );
            normalizeReportType();
        } catch (Exception e) {
            log.error("补齐 psych_knowledge_report.report_type 失败: {}", e.getMessage(), e);
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

    private void normalizeReportType() {
        String sql = "UPDATE `psych_knowledge_report` " +
                "SET `report_type` = '其他' " +
                "WHERE `report_type` IS NULL " +
                "   OR TRIM(`report_type`) = '' " +
                "   OR `report_type` NOT IN ('内容违规','广告推广','人身攻击','隐私泄露','其他')";
        int updated = jdbcTemplate.update(sql);
        if (updated > 0) {
            log.warn("已修正 psych_knowledge_report 非法举报类型: {} 条", updated);
        }
    }
}

