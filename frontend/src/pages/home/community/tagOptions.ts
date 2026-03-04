export const COMMUNITY_TAG_OPTIONS = [
    "学习压力",
    "人际关系",
    "家庭矛盾",
    "考试焦虑",
    "情绪低落",
    "自我否定",
    "未来迷茫",
    "校园霸凌",
    "情感问题",
    "其他烦恼",
] as const;

export const TAG_KEYWORD_MAP: Record<string, string[]> = {
    "学习压力": ["学业", "学习", "压力", "考试", "备考", "绩点", "成绩", "期末", "作业", "论文", "课程", "挂科", "复习", "考研", "就业", "实习"],
    "人际关系": ["人际", "室友", "宿舍", "同学", "朋友", "社交", "关系", "矛盾", "沟通", "冲突", "孤立", "霸凌", "同伴"],
    "家庭矛盾": ["家庭", "父母", "家人", "矛盾", "冲突", "争吵", "沟通", "代沟", "亲子"],
    "考试焦虑": ["考试", "焦虑", "紧张", "失眠", "复习", "备考", "考场", "发挥", "恐惧"],
    "情绪低落": ["情绪", "低落", "难过", "伤心", "压抑", "失眠", "无助", "崩溃", "烦躁"],
    "自我否定": ["自卑", "否定", "不自信", "没用", "失败", "讨厌自己", "价值感"],
    "未来迷茫": ["未来", "迷茫", "规划", "方向", "职业", "就业", "考研", "目标", "前途", "选择"],
    "校园霸凌": ["霸凌", "欺负", "排挤", "孤立", "威胁", "暴力", "侮辱", "嘲笑"],
    "情感问题": ["情感", "恋爱", "分手", "暗恋", "喜欢", "情侣", "失恋", "表白", "暧昧", "相处"],
    "其他烦恼": ["烦恼", "困扰", "压力", "迷茫", "求助", "怎么办", "无助", "焦虑"]
};

const normalizeText = (value?: string | null) => (value ?? "").toLowerCase();

export const inferPostTag = (title?: string | null, content?: string | null) => {
    const text = `${normalizeText(title)} ${normalizeText(content)}`;
    let bestTag = "其他烦恼";
    let bestScore = 0;

    COMMUNITY_TAG_OPTIONS.forEach((tag) => {
        if (tag === "其他烦恼") {
            return;
        }
        const keywords = TAG_KEYWORD_MAP[tag] ?? [];
        const score = keywords.reduce((count, keyword) => (text.includes(keyword) ? count + 1 : count), 0);
        if (score > bestScore) {
            bestScore = score;
            bestTag = tag;
        }
    });

    return bestScore > 0 ? bestTag : "其他烦恼";
};
