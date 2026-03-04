CREATE TABLE IF NOT EXISTS `psych_test_meta` (
    `class_name` varchar(50) NOT NULL COMMENT '测评类名（程序标识）',
    `category` varchar(32) NOT NULL DEFAULT 'personality' COMMENT '测试分类（personality/emotion/stress/relationship/study/career）',
    `duration_minutes` int DEFAULT NULL COMMENT '预计完成时长（分钟）',
    `rating` decimal(3,1) DEFAULT NULL COMMENT '评分（1.0-5.0）',
    PRIMARY KEY (`class_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='心理测评元数据';

INSERT INTO `psych_test_meta` (`class_name`,`category`,`duration_minutes`,`rating`) VALUES
('ExampleTest','personality',8,4.6),
('AASTest','relationship',8,4.7),
('CBCLTest','emotion',15,4.6),
('CCSASTest','emotion',12,4.7),
('DISCTest','personality',10,4.8),
('DSQTest','personality',12,4.6),
('ECRTest','relationship',10,4.7),
('EMBUTest','relationship',12,4.6),
('EPQTest','personality',8,4.7),
('FESCVTest','relationship',10,4.6),
('IPPATest','relationship',12,4.7),
('MMPITest','personality',20,4.8),
('RutterTest','emotion',15,4.6),
('SarasonTest','stress',8,4.7),
('SASTest','emotion',8,4.6),
('SCL90Test','emotion',15,4.7),
('UPITest','personality',10,4.6)
ON DUPLICATE KEY UPDATE
    `category` = VALUES(`category`),
    `duration_minutes` = VALUES(`duration_minutes`),
    `rating` = VALUES(`rating`);
