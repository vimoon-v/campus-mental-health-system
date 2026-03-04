-- 手动创建平台管理员账号（执行前请先修改密码）
-- 说明：
-- 1) 本脚本可重复执行：若账号已存在则不会重复插入。
-- 2) role=4 代表平台管理员（SYSTEM_ADMIN / PLATFORM_ADMIN）。
-- 3) 字段值需满足 user 表校验约束（用户名长度、姓名中文、手机号格式等）。

INSERT INTO `user`
(
    `username`,
    `nickname`,
    `description`,
    `avatar`,
    `name`,
    `password`,
    `gender`,
    `school_province`,
    `school`,
    `secondary_unit`,
    `major`,
    `role`,
    `position`,
    `email`,
    `phone_number`,
    `qq`,
    `wechat`,
    `registration_time`
)
SELECT
    'platform_admin',              -- 用户名（8-45位，字母数字下划线）
    '平台管理员',                   -- 昵称
    '',                            -- 描述
    NULL,                          -- 头像URL（可空）
    '平台管理',                     -- 姓名（2-6位中文）
    'ChangeMe123!',                -- 密码（上线前必须修改）
    9,                             -- 性别：9=其他
    110000,                        -- 学校省份编码：110000=北京市
    '平台管理中心',                  -- 学校名称
    '平台心理中心',                  -- 二级单位
    NULL,                          -- 专业
    4,                             -- 角色：4=平台管理员
    '心理部负责人',                 -- 职务（需在约束枚举内）
    'platformadmin@ucaacp.com',    -- 邮箱
    '13800000000',                 -- 电话
    NULL,                          -- QQ
    NULL,                          -- 微信
    NOW()
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1
    FROM `user`
    WHERE `username` = 'platform_admin'
);

