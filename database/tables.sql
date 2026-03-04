

CREATE SCHEMA IF NOT EXISTS `UCAACP`;


USE `UCAACP`;
-- 需要SQL版本5.0及以上
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+08:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- 用户表`user`
DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
                        `username` VARCHAR(45) NOT NULL COMMENT '用户名（账号名）',-- 用户名长度为8-45个字符
                        `nickname` VARCHAR(45) DEFAULT NULL COMMENT '昵称',-- 用户昵称最多45个字符(可以为NULL)
                        `description`  VARCHAR(255) DEFAULT NULL COMMENT '描述',-- 用户描述(可以为NULL)
                        `avatar` MEDIUMTEXT DEFAULT NULL COMMENT '头像(Base64或URL)',
                        `name` VARCHAR(6) NOT NULL COMMENT '姓名（个人真实姓名）',-- 姓名长度为2-6个字符
                        `password` VARCHAR(45) NOT NULL COMMENT '密码',-- 密码长度为8-45个字符
                        `gender` TINYINT NOT NULL COMMENT '性别',-- 性别编码
                        `school_province` BIGINT(20) NOT NULL COMMENT '学校所在省份',-- 行政区编码
                        `school` VARCHAR(60) NOT NULL COMMENT '所属学校',-- 学校名称4-60个字符
                        `secondary_unit` VARCHAR(100) NOT NULL COMMENT '二级单位',-- 二级单位名称2-100个字符
                        `major` VARCHAR(45) DEFAULT NULL COMMENT '专业',-- 专业名称长度2-45个字符(可以为NULL)
                        `role` TINYINT NOT NULL COMMENT '用户类型',-- 用户类型编码
                        `position` VARCHAR(20) NOT NULL COMMENT '职务',-- 职务长度2-20个字符
                        `email` VARCHAR(255) NOT NULL COMMENT '邮箱',-- 邮箱长度最多255个字符
                        `phone_number` VARCHAR(20) NOT NULL COMMENT '电话号码',-- 电话号码长度20个字符
                        `qq` VARCHAR(20) DEFAULT NULL COMMENT 'QQ账号',-- QQ账号长度6-20个字符(可以为NULL)
                        `wechat` VARCHAR(45) DEFAULT NULL COMMENT '微信账号',-- 微信账号长度6-20个字符(可以为NULL)
                        `registration_time` DATETIME NOT NULL DEFAULT NOW() COMMENT '注册时间',-- 注册时间
                        PRIMARY KEY (`username`),-- 用户名为主码
                        UNIQUE KEY `username_UNIQUE` (`username`),-- 用户名唯一
                        -- 用户名验证：用户名长度为8-45个字符，只能为字母、数字和下划线
                        CONSTRAINT `chk_username` CHECK((`username` REGEXP '^[A-Za-z0-9_]+$')AND(CHAR_LENGTH(`username`)>=8)),
                        -- 姓名验证：姓名长度为2-6个字符，只能为《通用规范汉字表》中汉字，符合国家标准【姓名登记条例】
                        CONSTRAINT `chk_name` CHECK((`name` REGEXP '^[\\x{4E00}-\\x{9FA5}\\x{3400}-\\x{4DBF}]+$')AND(CHAR_LENGTH(`name`)>=2)),
                        -- 密码验证：密码长度为8-45个字符，只能为字母、数字以及英文感叹号!和英文问号?
                        CONSTRAINT `chk_password` CHECK ((`password`REGEXP '^[A-Za-z0-9!?]+$')AND(CHAR_LENGTH(`password`)>=8)),
                        -- 性别验证：使用国家性别编码[0未知，1男性，2女性，9未指定(其他)]，符合国家标准【中华人民共和国国家标准:人的性别代码(GB 2261-1980)】
                        CONSTRAINT `chk_gender` CHECK ((`gender` in (0,1,2,9))),
                        -- 学校所在省份验证：使用行政区编码，符合国家标准【中华人民共和国行政区划代码(GB/T2260-2007)】
                        CONSTRAINT `chk_school_province` CHECK((`school_province` in (110000,120000,130000,140000,150000,210000,220000,230000,310000,320000,330000,340000,350000,360000,370000,410000,420000,430000,440000,450000,500000,510000,520000,530000,540000,610000,620000,630000,640000,650000,710000,810000,820000))),
                        -- 学校验证：学校名称4-60个字符
                        CONSTRAINT `chk_school` CHECK((CHAR_LENGTH(`school`)>=4)),
                        -- 二级单位验证：二级单位名称2-100个字符
                        CONSTRAINT `chk_secondary_unit` CHECK((CHAR_LENGTH(`secondary_unit`)>=2)),
                        -- 专业验证：专业名称长度2-45个字符
                        CONSTRAINT `chk_major` CHECK((`major` IS NULL)OR(CHAR_LENGTH(`major`)>=2)),
                        -- 用户类型验证：使用本项目的用户类型编码[0未知，1学生，2咨询师，3学校管理员，4平台管理员，9未指定(其他)]
                        CONSTRAINT `chk_identity` CHECK ((`role` in (0,1,2,3,4,9))),
                        -- 职务验证：职务长度2-20个字符，只能是['未指定','学生','心理部咨询员','心理部负责人','非心理部教职工']
                        CONSTRAINT `chk_position` CHECK ((`position` in (_utf8mb4'未指定',_utf8mb4'学生',_utf8mb4'心理部咨询员',_utf8mb4'心理部负责人',_utf8mb4'非心理部教职工'))),
                        -- 邮箱验证：邮箱长度最多255个字符，且符合邮箱格式
                        CONSTRAINT `chk_email` CHECK (`email` REGEXP '^[A-Za-z0-9\u4e00-\u9fa5]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$'),
                        -- 电话号码验证：电话号码长度20个字符，且符合电话号码格式，符合国家标准。
                        CONSTRAINT `chk_phone_number` CHECK(`phone_number` REGEXP '^[\+]?[0-9]{0,3}[\-]?(13|14|15|16|17|18|19)[0-9]{9}|0\d{2,3}-\d{7,8}|^0\d{2,3}-\d{7,8}-\d{1,4}$'),
                        -- QQ账号验证：QQ账号长度6-20个字符
                        CONSTRAINT `chk_qq` CHECK((`qq` IS NULL)OR(CHAR_LENGTH(`qq`)>=6)),
                        -- 微信账号验证：微信账号长度6-20个字符
                        CONSTRAINT `chk_wechat` CHECK((`wechat` IS NULL)OR(CHAR_LENGTH(`wechat`)>=6))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户表（用于注册和登录）';





DROP TABLE IF EXISTS `appointment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appointment` (
                               `appointment_id` int NOT NULL AUTO_INCREMENT COMMENT '预约ID，主键自增',
                               `student_username` varchar(45) NOT NULL COMMENT '学生用户名（外键关联用户表）',
                               `teacher_username` varchar(45) NOT NULL COMMENT '教师用户名（外键关联用户表）',
                               `description` text COMMENT '预约描述',
                               `is_anonymous` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否匿名预约（0：否，1：是）',
                               `reject_reason` text COMMENT '教师拒绝原因',
                               `appointment_type` enum('ONLINE','OFFLINE') NOT NULL DEFAULT 'ONLINE' COMMENT '预约类型',
                               `start_time` datetime NOT NULL COMMENT '预约开始时间',
                               `end_time` datetime NOT NULL COMMENT '预约结束时间',
                               `apply_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '预约申请时间',
                               `accept_time` datetime DEFAULT NULL COMMENT '教师接受时间',
                               `is_reschedule_pending` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否待学生确认改期（0：否，1：是）',
                               `reschedule_origin_start_time` datetime DEFAULT NULL COMMENT '改期前原开始时间',
                               `reschedule_origin_end_time` datetime DEFAULT NULL COMMENT '改期前原结束时间',
                               `is_overdue_flagged` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否被系统标记为超时未处理（0：否，1：是）',
                               `status` enum('WAITING','ACCEPTED','REJECTED','IN_PROGRESS','FORCE_CANCELLED') NOT NULL DEFAULT 'WAITING' COMMENT '处理状态',
                               PRIMARY KEY (`appointment_id`),
                               KEY `fk_appointment_student` (`student_username`),
                               KEY `fk_appointment_teacher` (`teacher_username`),
                               CONSTRAINT `fk_appointment_student` FOREIGN KEY (`student_username`) REFERENCES `user` (`username`) ON DELETE CASCADE ON UPDATE CASCADE,
                               CONSTRAINT `fk_appointment_teacher` FOREIGN KEY (`teacher_username`) REFERENCES `user` (`username`) ON DELETE CASCADE ON UPDATE CASCADE,
                               CONSTRAINT `chk_apply_time` CHECK ((`apply_time` <= `start_time`)),
                               CONSTRAINT `chk_time_order` CHECK ((`end_time` > `start_time`))
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='预约表（学生与教师的预约记录）';
/*!40101 SET character_set_client = @saved_cs_client */;






DROP TABLE IF EXISTS `consultation_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consultation_session` (
                                        `session_id` int NOT NULL AUTO_INCREMENT COMMENT '会话ID',
                                        `appointment_id` int NOT NULL COMMENT '关联预约ID',
                                        `student_username` varchar(45) NOT NULL COMMENT '学生用户名',
                                        `teacher_username` varchar(45) NOT NULL COMMENT '咨询师用户名',
                                        `status` varchar(16) NOT NULL DEFAULT 'OPEN' COMMENT '会话状态(OPEN/CLOSED)',
                                        `last_message_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '最后消息时间',
                                        `created_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                                        `updated_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
                                        PRIMARY KEY (`session_id`),
                                        UNIQUE KEY `uk_consultation_session_appointment` (`appointment_id`),
                                        KEY `idx_consultation_session_student` (`student_username`),
                                        KEY `idx_consultation_session_teacher` (`teacher_username`),
                                        KEY `idx_consultation_session_last_message_time` (`last_message_time`),
                                        CONSTRAINT `fk_consultation_session_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointment` (`appointment_id`) ON DELETE CASCADE ON UPDATE CASCADE,
                                        CONSTRAINT `fk_consultation_session_student` FOREIGN KEY (`student_username`) REFERENCES `user` (`username`) ON DELETE CASCADE ON UPDATE CASCADE,
                                        CONSTRAINT `fk_consultation_session_teacher` FOREIGN KEY (`teacher_username`) REFERENCES `user` (`username`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='在线咨询会话表';
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `consultation_message`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consultation_message` (
                                        `message_id` int NOT NULL AUTO_INCREMENT COMMENT '消息ID',
                                        `session_id` int NOT NULL COMMENT '会话ID',
                                        `sender_username` varchar(45) NOT NULL COMMENT '发送者用户名',
                                        `receiver_username` varchar(45) NOT NULL COMMENT '接收者用户名',
                                        `message_type` varchar(16) NOT NULL DEFAULT 'TEXT' COMMENT '消息类型(TEXT)',
                                        `content` text NOT NULL COMMENT '消息内容',
                                        `sent_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
                                        `is_read` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否已读（0未读，1已读）',
                                        PRIMARY KEY (`message_id`),
                                        KEY `idx_consultation_message_session_time` (`session_id`,`sent_time`),
                                        KEY `idx_consultation_message_receiver_read` (`receiver_username`,`is_read`),
                                        CONSTRAINT `fk_consultation_message_session` FOREIGN KEY (`session_id`) REFERENCES `consultation_session` (`session_id`) ON DELETE CASCADE ON UPDATE CASCADE,
                                        CONSTRAINT `fk_consultation_message_sender` FOREIGN KEY (`sender_username`) REFERENCES `user` (`username`) ON DELETE CASCADE ON UPDATE CASCADE,
                                        CONSTRAINT `fk_consultation_message_receiver` FOREIGN KEY (`receiver_username`) REFERENCES `user` (`username`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='在线咨询消息表';
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `post`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `post` (
                        `post_id` int NOT NULL AUTO_INCREMENT COMMENT '帖子ID，主键自增',
                        `title` varchar(255) NOT NULL COMMENT '帖子标题',
                        `content` text NOT NULL COMMENT '帖子内容',
                        `username` varchar(45) NOT NULL COMMENT '发布者用户名，关联用户表',
                        `publish_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间，默认当前时间',
                        `is_anonymous` tinyint(1) NOT NULL COMMENT '是否匿名（0：否，1：是）',
                        `is_public` tinyint(1) NOT NULL COMMENT '是否公开（0：否，1：是）',
                        `need_reply` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否希望老师优先回复（0：否，1：是）',
                        `allow_comment` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否允许评论（0：否，1：是）',
                        `show_in_recommend` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否展示在推荐列表（0：否，1：是）',
                        `anonymous_like` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否匿名接收点赞（0：否，1：是）',
                        `primary_tag` varchar(32) NOT NULL DEFAULT '其他烦恼' COMMENT '主标签（发布时选择）',
                        PRIMARY KEY (`post_id`),
                        KEY `fk_post_user` (`username`),
                        CONSTRAINT `fk_post_user` FOREIGN KEY (`username`) REFERENCES `user` (`username`) ON DELETE CASCADE ON UPDATE CASCADE,
                        CONSTRAINT `chk_is_anonymous` CHECK ((`is_anonymous` in (0,1))),
                        CONSTRAINT `chk_is_public` CHECK ((`is_public` in (0,1))),
                        CONSTRAINT `chk_need_reply` CHECK ((`need_reply` in (0,1))),
                        CONSTRAINT `chk_allow_comment` CHECK ((`allow_comment` in (0,1))),
                        CONSTRAINT `chk_show_in_recommend` CHECK ((`show_in_recommend` in (0,1))),
                        CONSTRAINT `chk_anonymous_like` CHECK ((`anonymous_like` in (0,1)))
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='帖子表（存储用户发布的帖子信息）';
/*!40101 SET character_set_client = @saved_cs_client */;



DROP TABLE IF EXISTS `post_like`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `post_like` (
                             `like_id` int NOT NULL AUTO_INCREMENT COMMENT '点赞ID，主键自增',
                             `post_id` int NOT NULL COMMENT '帖子ID，关联post表',
                             `username` varchar(45) NOT NULL COMMENT '点赞用户用户名，关联user表',
                             `like_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '点赞时间',
                             PRIMARY KEY (`like_id`),
                             UNIQUE KEY `uk_post_like` (`post_id`,`username`),
                             KEY `fk_like_post` (`post_id`),
                             KEY `fk_like_user` (`username`),
                             CONSTRAINT `fk_like_post` FOREIGN KEY (`post_id`) REFERENCES `post` (`post_id`) ON DELETE CASCADE ON UPDATE CASCADE,
                             CONSTRAINT `fk_like_user` FOREIGN KEY (`username`) REFERENCES `user` (`username`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='帖子点赞表';

DROP TABLE IF EXISTS `post_favorite`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `post_favorite` (
                                 `favorite_id` int NOT NULL AUTO_INCREMENT COMMENT '收藏ID，主键自增',
                                 `post_id` int NOT NULL COMMENT '帖子ID，关联post表',
                                 `username` varchar(45) NOT NULL COMMENT '收藏用户用户名，关联user表',
                                 `favorite_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
                                 PRIMARY KEY (`favorite_id`),
                                 UNIQUE KEY `uk_post_favorite` (`post_id`,`username`),
                                 KEY `fk_favorite_post` (`post_id`),
                                 KEY `fk_favorite_user` (`username`),
                                 CONSTRAINT `fk_favorite_post` FOREIGN KEY (`post_id`) REFERENCES `post` (`post_id`) ON DELETE CASCADE ON UPDATE CASCADE,
                                 CONSTRAINT `fk_favorite_user` FOREIGN KEY (`username`) REFERENCES `user` (`username`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='帖子收藏表';

DROP TABLE IF EXISTS `system_notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_notification` (
                                       `notification_id` int NOT NULL AUTO_INCREMENT COMMENT '通知ID',
                                       `recipient_username` varchar(45) NOT NULL COMMENT '接收者用户名',
                                       `sender_username` varchar(45) DEFAULT NULL COMMENT '发送者用户名',
                                       `notification_type` varchar(32) NOT NULL COMMENT '通知类型',
                                       `title` varchar(120) NOT NULL COMMENT '通知标题',
                                       `content` text NOT NULL COMMENT '通知内容',
                                       `related_type` varchar(32) DEFAULT NULL COMMENT '关联业务类型',
                                       `related_id` int DEFAULT NULL COMMENT '关联业务ID',
                                       `is_read` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否已读（0未读，1已读）',
                                       `created_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                                       PRIMARY KEY (`notification_id`),
                                       KEY `idx_notification_recipient` (`recipient_username`),
                                       KEY `idx_notification_read` (`recipient_username`,`is_read`),
                                       KEY `idx_notification_time` (`created_time`),
                                       CONSTRAINT `fk_notification_recipient` FOREIGN KEY (`recipient_username`) REFERENCES `user` (`username`) ON DELETE CASCADE ON UPDATE CASCADE,
                                       CONSTRAINT `fk_notification_sender` FOREIGN KEY (`sender_username`) REFERENCES `user` (`username`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统通知表';

/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `reply`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reply` (
                         `reply_id` int NOT NULL AUTO_INCREMENT COMMENT '回帖ID，主键自增',
                         `content` text NOT NULL COMMENT '回复内容',
                         `post_id` int NOT NULL COMMENT '被回复的帖子ID，关联帖子表',
                         `username` varchar(45) NOT NULL COMMENT '回复者用户名，关联用户表',
                         `parent_reply_id` int DEFAULT NULL COMMENT '父评论ID（为空表示直接回复帖子）',
                         `reply_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '回帖时间',
                         PRIMARY KEY (`reply_id`),
                         KEY `fk_reply_post` (`post_id`),
                         KEY `fk_reply_user` (`username`),
                         KEY `fk_reply_parent` (`parent_reply_id`),
                         CONSTRAINT `fk_reply_post` FOREIGN KEY (`post_id`) REFERENCES `post` (`post_id`) ON DELETE CASCADE ON UPDATE CASCADE,
                         CONSTRAINT `fk_reply_user` FOREIGN KEY (`username`) REFERENCES `user` (`username`) ON DELETE CASCADE ON UPDATE CASCADE,
                         CONSTRAINT `fk_reply_parent` FOREIGN KEY (`parent_reply_id`) REFERENCES `reply` (`reply_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='回帖表（存储用户对帖子的回复信息）';
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `post_report`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `post_report` (
                               `report_id` int NOT NULL AUTO_INCREMENT COMMENT '举报记录ID（主键），自增唯一',
                               `post_id` int NOT NULL COMMENT '被举报的帖子ID，关联post表的post_id',
                               `report_reason` text NOT NULL COMMENT '举报理由（非空，需详细说明原因）',
                               `report_type` varchar(20) NOT NULL DEFAULT '其他' COMMENT '举报类型：内容违规/广告推广/人身攻击/隐私泄露/其他',
                               `reporter_username` varchar(50) DEFAULT NULL COMMENT '举报者用户名，关联user表的username',
                               `report_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '举报提交时间，默认当前时间',
                               PRIMARY KEY (`report_id`),
                               UNIQUE KEY `uk_post_report_post_reporter` (`post_id`,`reporter_username`),
                               KEY `fk_report_post` (`post_id`),
                               KEY `fk_report_post_reporter` (`reporter_username`),
                               CONSTRAINT `fk_report_post` FOREIGN KEY (`post_id`) REFERENCES `post` (`post_id`) ON DELETE CASCADE ON UPDATE CASCADE,
                               CONSTRAINT `fk_report_post_reporter` FOREIGN KEY (`reporter_username`) REFERENCES `user` (`username`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='举报帖子表：存储用户对论坛/社区帖子内容的举报记录';



DROP TABLE IF EXISTS `psych_assessment_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `psych_assessment_record` (
                                           `assessment_id` int NOT NULL AUTO_INCREMENT COMMENT '测评记录ID（主键），自增唯一',
                                           `assessment_class` varchar(50) NOT NULL COMMENT '测评类名（程序标识，如DISCTest）',
                                           `assessment_name` varchar(100) NOT NULL COMMENT '测评中文名称（用户可见）',
                                           `test_username` varchar(50) DEFAULT NULL COMMENT '测试用户名称（关联user表username）',
                                           `assessment_report` text NOT NULL COMMENT '测评报告（含得分、分析、建议）',
                                           `assessment_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '测评完成时间',
                                           PRIMARY KEY (`assessment_id`),
                                           KEY `fk_assessment_user` (`test_username`),
                                           KEY `idx_assessment_class` (`assessment_class`),
                                           KEY `idx_assessment_time` (`assessment_time`),
                                           CONSTRAINT `fk_assessment_user` FOREIGN KEY (`test_username`) REFERENCES `user` (`username`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='心理测评记录表（含测试用户外键，关联user表）';
/*!40101 SET character_set_client = @saved_cs_client */;

DROP TABLE IF EXISTS `psych_test_meta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `psych_test_meta` (
                                   `class_name` varchar(50) NOT NULL COMMENT '测评类名（程序标识）',
                                   `category` varchar(32) NOT NULL DEFAULT 'personality' COMMENT '测试分类（personality/emotion/stress/relationship/study/career）',
                                   `duration_minutes` int DEFAULT NULL COMMENT '预计完成时长（分钟）',
                                   `rating` decimal(3,1) DEFAULT NULL COMMENT '评分（1.0-5.0）',
                                   PRIMARY KEY (`class_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='心理测评元数据';
/*!40101 SET character_set_client = @saved_cs_client */;

DROP TABLE IF EXISTS `psych_test_manage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `psych_test_manage` (
                                     `test_id` int NOT NULL AUTO_INCREMENT COMMENT '测试ID',
                                     `title` varchar(255) NOT NULL COMMENT '测试标题',
                                     `description` text COMMENT '测试说明',
                                     `category` varchar(32) NOT NULL DEFAULT 'personality' COMMENT '测试分类',
                                     `grade_scope` varchar(16) NOT NULL DEFAULT 'all' COMMENT '适用年级(all/freshman/sophomore/junior/senior)',
                                     `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft' COMMENT '发布状态',
                                     `duration_minutes` int DEFAULT NULL COMMENT '预计完成时长（分钟）',
                                     `allow_repeat` tinyint(1) NOT NULL DEFAULT 1 COMMENT '允许重复测试',
                                     `show_result` tinyint(1) NOT NULL DEFAULT 1 COMMENT '允许查看结果',
                                     `auto_warn` tinyint(1) NOT NULL DEFAULT 1 COMMENT '高风险自动预警',
                                     `valid_from` date DEFAULT NULL COMMENT '生效开始日期',
                                     `valid_to` date DEFAULT NULL COMMENT '生效截止日期',
                                     `participants` int NOT NULL DEFAULT 0 COMMENT '参与人数',
                                     `pass_rate` decimal(5,2) DEFAULT NULL COMMENT '通过率(0-100)',
                                     `rating` decimal(3,1) DEFAULT NULL COMMENT '评分',
                                     `teacher_username` varchar(45) NOT NULL COMMENT '创建者用户名',
                                     `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                                     `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
                                     `publish_time` datetime DEFAULT NULL COMMENT '发布时间',
                                     PRIMARY KEY (`test_id`),
                                     KEY `fk_psych_test_manage_teacher` (`teacher_username`),
                                     CONSTRAINT `fk_psych_test_manage_teacher` FOREIGN KEY (`teacher_username`) REFERENCES `user` (`username`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='心理测试管理表';
/*!40101 SET character_set_client = @saved_cs_client */;

DROP TABLE IF EXISTS `psych_test_question`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `psych_test_question` (
                                      `question_id` int NOT NULL AUTO_INCREMENT COMMENT '题目ID',
                                      `test_id` int NOT NULL COMMENT '测试ID',
                                      `title` text NOT NULL COMMENT '题目内容',
                                      `type` enum('single','multiple','scale','fill') NOT NULL DEFAULT 'single' COMMENT '题目类型',
                                      `order_index` int NOT NULL DEFAULT 0 COMMENT '题目顺序',
                                      PRIMARY KEY (`question_id`),
                                      KEY `fk_psych_test_question_test` (`test_id`),
                                      CONSTRAINT `fk_psych_test_question_test` FOREIGN KEY (`test_id`) REFERENCES `psych_test_manage` (`test_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='心理测试题目表';
/*!40101 SET character_set_client = @saved_cs_client */;

DROP TABLE IF EXISTS `psych_test_option`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `psych_test_option` (
                                     `option_id` int NOT NULL AUTO_INCREMENT COMMENT '选项ID',
                                     `question_id` int NOT NULL COMMENT '题目ID',
                                     `label` varchar(255) NOT NULL COMMENT '选项内容',
                                     `score` int DEFAULT NULL COMMENT '选项分值',
                                     `order_index` int NOT NULL DEFAULT 0 COMMENT '选项顺序',
                                     PRIMARY KEY (`option_id`),
                                     KEY `fk_psych_test_option_question` (`question_id`),
                                     CONSTRAINT `fk_psych_test_option_question` FOREIGN KEY (`question_id`) REFERENCES `psych_test_question` (`question_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='心理测试选项表';
/*!40101 SET character_set_client = @saved_cs_client */;

DROP TABLE IF EXISTS `psych_knowledge`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `psych_knowledge` (
                                   `knowledge_id` int NOT NULL AUTO_INCREMENT COMMENT '科普ID（主键），自增唯一',
                                   `title` varchar(255) NOT NULL COMMENT '科普标题（非空，如“大学生常见焦虑应对方法”）',
                                   `content` text NOT NULL COMMENT '科普详细内容（非空，含心理知识、案例、建议等）',
                                   `summary` varchar(512) DEFAULT NULL COMMENT '文章摘要',
                                   `tags` text DEFAULT NULL COMMENT '文章标签（逗号分隔）',
                                   `cover_image` mediumtext DEFAULT NULL COMMENT '封面图片（Base64或URL）',
                                   `category` varchar(32) NOT NULL DEFAULT 'growth' COMMENT '科普分类（如情绪管理/压力应对等）',
                                   `publish_status` varchar(16) NOT NULL DEFAULT 'publish' COMMENT '发布状态：publish/schedule/draft',
                                   `schedule_time` datetime DEFAULT NULL COMMENT '定时发布时间',
                                   `visible_range` varchar(16) NOT NULL DEFAULT 'all' COMMENT '可见范围',
                                   `allow_comment` tinyint(1) NOT NULL DEFAULT 1 COMMENT '允许评论',
                                   `recommended` tinyint(1) NOT NULL DEFAULT 0 COMMENT '推荐文章',
                                   `view_count` int NOT NULL DEFAULT 0 COMMENT '阅读量',
                                   `teacher_publisher_username` varchar(45) NOT NULL COMMENT '发布者（心理咨询教师）用户名，关联user表',
                                   `publish_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '科普发布时间，默认当前系统时间',
                                   `admin_reviewer_username` varchar(45) DEFAULT NULL COMMENT '审核者（心理中心管理员）用户名，关联user表',
                                   `review_time` datetime DEFAULT NULL COMMENT '审核完成时间，未审核时为NULL',
                                   `review_status` enum('PENDING','PASSED','BANNED','REVOKED') NOT NULL DEFAULT 'PENDING' COMMENT '审核状态：PENDING(待审核)、PASSED(审核通过)、BANNED(审核驳回)、REVOKED(已撤销)',
                                   PRIMARY KEY (`knowledge_id`),
                                   KEY `fk_knowledge_teacher` (`teacher_publisher_username`),
                                   KEY `fk_knowledge_admin` (`admin_reviewer_username`),
                                   CONSTRAINT `fk_knowledge_admin` FOREIGN KEY (`admin_reviewer_username`) REFERENCES `user` (`username`) ON DELETE SET NULL ON UPDATE CASCADE,
                                   CONSTRAINT `fk_knowledge_teacher` FOREIGN KEY (`teacher_publisher_username`) REFERENCES `user` (`username`) ON DELETE RESTRICT ON UPDATE CASCADE,
                                   CONSTRAINT `chk_review_time` CHECK ((((`review_status` in (_utf8mb3'PENDING',_utf8mb3'REVOKED')) and (`review_time` is null)) or ((`review_status` in (_utf8mb3'PASSED',_utf8mb3'BANNED')) and (`review_time` is not null))))
) ENGINE=InnoDB AUTO_INCREMENT=198 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='心理知识科普表：存储心理咨询教师发布、心理中心管理员审核的科普内容';

DROP TABLE IF EXISTS `psych_knowledge_like`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `psych_knowledge_like` (
                                        `like_id` int NOT NULL AUTO_INCREMENT COMMENT '点赞ID，主键自增',
                                        `knowledge_id` int NOT NULL COMMENT '科普ID，关联psych_knowledge表',
                                        `username` varchar(45) NOT NULL COMMENT '点赞用户用户名，关联user表',
                                        `like_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '点赞时间',
                                        PRIMARY KEY (`like_id`),
                                        UNIQUE KEY `uk_knowledge_like` (`knowledge_id`,`username`),
                                        KEY `fk_knowledge_like_knowledge` (`knowledge_id`),
                                        KEY `fk_knowledge_like_user` (`username`),
                                        CONSTRAINT `fk_knowledge_like_knowledge` FOREIGN KEY (`knowledge_id`) REFERENCES `psych_knowledge` (`knowledge_id`) ON DELETE CASCADE ON UPDATE CASCADE,
                                        CONSTRAINT `fk_knowledge_like_user` FOREIGN KEY (`username`) REFERENCES `user` (`username`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='心理科普点赞表';

DROP TABLE IF EXISTS `psych_knowledge_report`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `psych_knowledge_report` (
                                          `report_id` int NOT NULL AUTO_INCREMENT COMMENT '举报记录ID（主键），自增唯一',
                                          `knowledge_id` int NOT NULL COMMENT '被举报的科普ID，关联psych_knowledge表的knowledge_id',
                                          `report_reason` text NOT NULL COMMENT '举报理由（非空，需详细说明原因）',
                                          `report_type` varchar(20) NOT NULL DEFAULT '其他' COMMENT '举报类型：内容违规/广告推广/人身攻击/隐私泄露/其他',
                                          `reporter_username` varchar(50) DEFAULT NULL COMMENT '举报者用户名，关联user表的username（主键），允许为NULL',
                                          `report_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '举报提交时间，默认当前时间',
                                          PRIMARY KEY (`report_id`),
                                          KEY `fk_report_knowledge` (`knowledge_id`),
                                          KEY `fk_report_reporter` (`reporter_username`),
                                          CONSTRAINT `fk_report_knowledge` FOREIGN KEY (`knowledge_id`) REFERENCES `psych_knowledge` (`knowledge_id`) ON DELETE CASCADE ON UPDATE CASCADE,
                                          CONSTRAINT `fk_report_reporter` FOREIGN KEY (`reporter_username`) REFERENCES `user` (`username`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=296 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='心理知识科普举报表（解决1830错误：允许reporter_username为NULL以适配ON DELETE SET NULL）';




/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
