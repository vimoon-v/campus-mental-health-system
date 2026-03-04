package com.ucaacp.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class ConsultationSchemaInitializer {

    private static final Logger log = LoggerFactory.getLogger(ConsultationSchemaInitializer.class);
    private final JdbcTemplate jdbcTemplate;

    public ConsultationSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureTables() {
        try {
            ensureConsultationSessionTable();
            ensureConsultationMessageTable();
        } catch (Exception e) {
            log.error("初始化在线咨询表失败: {}", e.getMessage(), e);
        }
    }

    private void ensureConsultationSessionTable() {
        if (tableExists("consultation_session")) {
            return;
        }
        jdbcTemplate.execute(
                "CREATE TABLE `consultation_session` (" +
                        "`session_id` INT NOT NULL AUTO_INCREMENT COMMENT '会话ID'," +
                        "`appointment_id` INT NOT NULL COMMENT '关联预约ID'," +
                        "`student_username` VARCHAR(45) NOT NULL COMMENT '学生用户名'," +
                        "`teacher_username` VARCHAR(45) NOT NULL COMMENT '咨询师用户名'," +
                        "`status` VARCHAR(16) NOT NULL DEFAULT 'OPEN' COMMENT '会话状态(OPEN/CLOSED)'," +
                        "`last_message_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '最后消息时间'," +
                        "`created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'," +
                        "`updated_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'," +
                        "PRIMARY KEY (`session_id`)," +
                        "UNIQUE KEY `uk_consultation_session_appointment` (`appointment_id`)," +
                        "KEY `idx_consultation_session_student` (`student_username`)," +
                        "KEY `idx_consultation_session_teacher` (`teacher_username`)," +
                        "KEY `idx_consultation_session_last_message_time` (`last_message_time`)," +
                        "CONSTRAINT `fk_consultation_session_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointment` (`appointment_id`) ON DELETE CASCADE ON UPDATE CASCADE," +
                        "CONSTRAINT `fk_consultation_session_student` FOREIGN KEY (`student_username`) REFERENCES `user` (`username`) ON DELETE CASCADE ON UPDATE CASCADE," +
                        "CONSTRAINT `fk_consultation_session_teacher` FOREIGN KEY (`teacher_username`) REFERENCES `user` (`username`) ON DELETE CASCADE ON UPDATE CASCADE" +
                        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='在线咨询会话表'"
        );
        log.info("已创建表 consultation_session");
    }

    private void ensureConsultationMessageTable() {
        if (tableExists("consultation_message")) {
            return;
        }
        jdbcTemplate.execute(
                "CREATE TABLE `consultation_message` (" +
                        "`message_id` INT NOT NULL AUTO_INCREMENT COMMENT '消息ID'," +
                        "`session_id` INT NOT NULL COMMENT '会话ID'," +
                        "`sender_username` VARCHAR(45) NOT NULL COMMENT '发送者用户名'," +
                        "`receiver_username` VARCHAR(45) NOT NULL COMMENT '接收者用户名'," +
                        "`message_type` VARCHAR(16) NOT NULL DEFAULT 'TEXT' COMMENT '消息类型(TEXT)'," +
                        "`content` TEXT NOT NULL COMMENT '消息内容'," +
                        "`sent_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间'," +
                        "`is_read` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已读'," +
                        "PRIMARY KEY (`message_id`)," +
                        "KEY `idx_consultation_message_session_time` (`session_id`,`sent_time`)," +
                        "KEY `idx_consultation_message_receiver_read` (`receiver_username`,`is_read`)," +
                        "CONSTRAINT `fk_consultation_message_session` FOREIGN KEY (`session_id`) REFERENCES `consultation_session` (`session_id`) ON DELETE CASCADE ON UPDATE CASCADE," +
                        "CONSTRAINT `fk_consultation_message_sender` FOREIGN KEY (`sender_username`) REFERENCES `user` (`username`) ON DELETE CASCADE ON UPDATE CASCADE," +
                        "CONSTRAINT `fk_consultation_message_receiver` FOREIGN KEY (`receiver_username`) REFERENCES `user` (`username`) ON DELETE CASCADE ON UPDATE CASCADE" +
                        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='在线咨询消息表'"
        );
        log.info("已创建表 consultation_message");
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
