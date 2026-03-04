USE `UCAACP`;

CREATE TABLE IF NOT EXISTS `psych_knowledge_like` (
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
