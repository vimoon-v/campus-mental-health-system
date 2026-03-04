package com.ucaacp.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class PsychTestManageSchemaInitializer {

    private static final Logger log = LoggerFactory.getLogger(PsychTestManageSchemaInitializer.class);

    private final JdbcTemplate jdbcTemplate;

    public PsychTestManageSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureColumns() {
        try {
            if (!tableExists("psych_test_manage")) {
                log.warn("表 psych_test_manage 不存在，跳过字段补齐");
                return;
            }
            addColumnIfMissing(
                    "psych_test_manage",
                    "grade_scope",
                    "VARCHAR(16) NOT NULL DEFAULT 'all' COMMENT '适用年级(all/freshman/sophomore/junior/senior)'"
            );
            addColumnIfMissing(
                    "psych_test_manage",
                    "pass_rate",
                    "DECIMAL(5,2) DEFAULT NULL COMMENT '通过率(0-100)'"
            );

            normalizeGradeScope();
            normalizePassRate();
        } catch (Exception e) {
            log.error("补齐 psych_test_manage 字段失败: {}", e.getMessage(), e);
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

    private void normalizeGradeScope() {
        int updated = jdbcTemplate.update(
                "UPDATE `psych_test_manage` " +
                        "SET `grade_scope` = 'all' " +
                        "WHERE `grade_scope` IS NULL " +
                        "   OR TRIM(`grade_scope`) = '' " +
                        "   OR `grade_scope` NOT IN ('all','freshman','sophomore','junior','senior')"
        );
        if (updated > 0) {
            log.warn("已修正 psych_test_manage 非法年级范围: {} 条", updated);
        }
    }

    private void normalizePassRate() {
        int lower = jdbcTemplate.update("UPDATE `psych_test_manage` SET `pass_rate` = 0 WHERE `pass_rate` < 0");
        int upper = jdbcTemplate.update("UPDATE `psych_test_manage` SET `pass_rate` = 100 WHERE `pass_rate` > 100");
        if (lower > 0 || upper > 0) {
            log.warn("已修正 psych_test_manage 越界通过率: 低于0={} 条, 高于100={} 条", lower, upper);
        }
    }
}
