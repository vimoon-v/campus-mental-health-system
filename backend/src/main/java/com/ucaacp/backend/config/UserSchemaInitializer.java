package com.ucaacp.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class UserSchemaInitializer {

    private static final Logger log = LoggerFactory.getLogger(UserSchemaInitializer.class);

    private final JdbcTemplate jdbcTemplate;

    public UserSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureUserAvatarColumn() {
        try {
            if (!tableExists("user")) {
                log.warn("表 user 不存在，跳过头像字段补齐");
                return;
            }
            addColumnIfMissing("user", "avatar", "MEDIUMTEXT NULL COMMENT '用户头像(Base64或URL)'");
            normalizeRoleValues();
            ensureRoleCheckConstraint();
        } catch (Exception e) {
            log.error("初始化 user 表扩展逻辑失败: {}", e.getMessage(), e);
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

    private boolean checkConstraintExists(String tableName, String constraintName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS " +
                        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'CHECK'",
                Integer.class,
                tableName,
                constraintName
        );
        return count != null && count > 0;
    }

    private void normalizeRoleValues() {
        int updated = jdbcTemplate.update(
                "UPDATE `user` SET `role` = 9 WHERE `role` NOT IN (0,1,2,3,4,9)"
        );
        if (updated > 0) {
            log.warn("已修正 user 非法角色编码: {} 条", updated);
        }
    }

    private void ensureRoleCheckConstraint() {
        try {
            if (checkConstraintExists("user", "chk_identity")) {
                jdbcTemplate.execute("ALTER TABLE `user` DROP CHECK `chk_identity`");
            }
            jdbcTemplate.execute("ALTER TABLE `user` ADD CONSTRAINT `chk_identity` CHECK ((`role` in (0,1,2,3,4,9)))");
            log.info("已补齐/更新约束: user.chk_identity");
        } catch (Exception e) {
            log.warn("更新 user.chk_identity 失败（可能数据库版本不支持CHECK），已跳过: {}", e.getMessage());
        }
    }
}
