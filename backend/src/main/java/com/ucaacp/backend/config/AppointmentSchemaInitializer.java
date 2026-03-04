package com.ucaacp.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class AppointmentSchemaInitializer {

    private static final Logger log = LoggerFactory.getLogger(AppointmentSchemaInitializer.class);
    private final JdbcTemplate jdbcTemplate;

    public AppointmentSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureColumns() {
        try {
            ensureRejectReasonColumn();
            ensureAnonymousColumn();
            ensureAcceptTimeColumn();
            ensureReschedulePendingColumn();
            ensureRescheduleOriginStartColumn();
            ensureRescheduleOriginEndColumn();
            ensureOverdueFlagColumn();
            migrateAppointmentStatus();
        } catch (Exception e) {
            log.error("初始化预约表扩展字段失败: {}", e.getMessage(), e);
        }
    }

    private void ensureRejectReasonColumn() {
        if (columnExists("appointment", "reject_reason")) {
            return;
        }
        jdbcTemplate.execute("ALTER TABLE `appointment` ADD COLUMN `reject_reason` TEXT NULL COMMENT '教师拒绝原因' AFTER `description`");
        log.info("已为 appointment 表新增字段 reject_reason");
    }

    private void ensureAnonymousColumn() {
        if (columnExists("appointment", "is_anonymous")) {
            return;
        }
        jdbcTemplate.execute("ALTER TABLE `appointment` ADD COLUMN `is_anonymous` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否匿名预约' AFTER `description`");
        log.info("已为 appointment 表新增字段 is_anonymous");
    }

    private void ensureAcceptTimeColumn() {
        if (columnExists("appointment", "accept_time")) {
            return;
        }
        jdbcTemplate.execute("ALTER TABLE `appointment` ADD COLUMN `accept_time` DATETIME NULL COMMENT '接受时间' AFTER `apply_time`");
        log.info("已为 appointment 表新增字段 accept_time");
    }

    private void ensureReschedulePendingColumn() {
        if (columnExists("appointment", "is_reschedule_pending")) {
            return;
        }
        jdbcTemplate.execute("ALTER TABLE `appointment` ADD COLUMN `is_reschedule_pending` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否待学生确认改期' AFTER `accept_time`");
        log.info("已为 appointment 表新增字段 is_reschedule_pending");
    }

    private void ensureRescheduleOriginStartColumn() {
        if (columnExists("appointment", "reschedule_origin_start_time")) {
            return;
        }
        jdbcTemplate.execute("ALTER TABLE `appointment` ADD COLUMN `reschedule_origin_start_time` DATETIME NULL COMMENT '改期前原开始时间' AFTER `is_reschedule_pending`");
        log.info("已为 appointment 表新增字段 reschedule_origin_start_time");
    }

    private void ensureRescheduleOriginEndColumn() {
        if (columnExists("appointment", "reschedule_origin_end_time")) {
            return;
        }
        jdbcTemplate.execute("ALTER TABLE `appointment` ADD COLUMN `reschedule_origin_end_time` DATETIME NULL COMMENT '改期前原结束时间' AFTER `reschedule_origin_start_time`");
        log.info("已为 appointment 表新增字段 reschedule_origin_end_time");
    }

    private void ensureOverdueFlagColumn() {
        if (columnExists("appointment", "is_overdue_flagged")) {
            return;
        }
        jdbcTemplate.execute("ALTER TABLE `appointment` ADD COLUMN `is_overdue_flagged` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否被系统标记为超时未处理' AFTER `reschedule_origin_end_time`");
        log.info("已为 appointment 表新增字段 is_overdue_flagged");
    }

    private void migrateAppointmentStatus() {
        if (!columnExists("appointment", "status")) {
            return;
        }
        jdbcTemplate.execute(
                "ALTER TABLE `appointment` " +
                        "MODIFY COLUMN `status` ENUM('PENDING','CONFIRM','REJECT','RESCHEDULE','WAITING','ACCEPTED','REJECTED','IN_PROGRESS','FORCE_CANCELLED') " +
                        "NOT NULL DEFAULT 'WAITING' COMMENT '处理状态'"
        );
        jdbcTemplate.update("UPDATE `appointment` SET `status`='WAITING' WHERE `status` IN ('PENDING','RESCHEDULE')");
        jdbcTemplate.update("UPDATE `appointment` SET `status`='ACCEPTED' WHERE `status`='CONFIRM'");
        jdbcTemplate.update("UPDATE `appointment` SET `status`='REJECTED' WHERE `status`='REJECT'");
        jdbcTemplate.update("UPDATE `appointment` SET `accept_time`=NOW() WHERE `status`='ACCEPTED' AND `accept_time` IS NULL");
        jdbcTemplate.execute(
                "ALTER TABLE `appointment` " +
                        "MODIFY COLUMN `status` ENUM('WAITING','ACCEPTED','REJECTED','IN_PROGRESS','FORCE_CANCELLED') " +
                        "NOT NULL DEFAULT 'WAITING' COMMENT '处理状态'"
        );
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
}
