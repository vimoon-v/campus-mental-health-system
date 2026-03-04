UPDATE psych_knowledge
SET category = CASE
    WHEN title LIKE '%睡眠%' OR content LIKE '%睡眠%' OR title LIKE '%失眠%' OR content LIKE '%失眠%' THEN 'sleep'
    WHEN title LIKE '%学习%' OR content LIKE '%学习%' OR title LIKE '%考试%' OR content LIKE '%考试%' THEN 'study'
    WHEN title LIKE '%人际%' OR content LIKE '%人际%' OR title LIKE '%沟通%' OR content LIKE '%沟通%' OR title LIKE '%社交%' OR content LIKE '%社交%' THEN 'relationship'
    WHEN title LIKE '%压力%' OR content LIKE '%压力%' OR title LIKE '%减压%' OR content LIKE '%减压%' THEN 'pressure'
    WHEN title LIKE '%焦虑%' OR content LIKE '%焦虑%' OR title LIKE '%恐惧%' OR content LIKE '%恐惧%' THEN 'anxiety'
    WHEN title LIKE '%情绪%' OR content LIKE '%情绪%' OR title LIKE '%抑郁%' OR content LIKE '%抑郁%' THEN 'emotion'
    WHEN title LIKE '%成长%' OR content LIKE '%成长%' OR title LIKE '%自我%' OR content LIKE '%自我%' THEN 'growth'
    ELSE category
END
WHERE category IS NULL OR category = '' OR category = 'growth';
