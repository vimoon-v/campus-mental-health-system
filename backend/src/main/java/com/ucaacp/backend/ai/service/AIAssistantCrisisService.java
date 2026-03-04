package com.ucaacp.backend.ai.service;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class AIAssistantCrisisService {

    private static final Set<String> CRISIS_KEYWORDS = Set.of(
            "自杀", "轻生", "不想活", "活不下去", "结束生命", "想死", "去死",
            "伤害自己", "伤害我自己", "割腕", "跳楼", "绝望", "生无可恋",
            "suicide", "kill myself", "end my life", "hurt myself"
    );

    public boolean isCrisisDetected(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }
        String normalized = message.toLowerCase(Locale.ROOT);
        for (String keyword : CRISIS_KEYWORDS) {
            if (normalized.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    public String buildCrisisResponse(List<String> hotlines) {
        StringBuilder builder = new StringBuilder();
        builder.append("我注意到你现在可能处在非常痛苦和危险的状态。你并不需要独自扛着这一切。\n");
        builder.append("请立刻联系身边值得信任的人（家人、室友、辅导员），并尽快寻求线下专业帮助。\n");
        builder.append("如果你有立即伤害自己的风险，请马上拨打以下电话：\n");
        if (hotlines != null && !hotlines.isEmpty()) {
            for (String hotline : hotlines) {
                builder.append("- ").append(hotline).append('\n');
            }
        } else {
            builder.append("- 110 公安报警电话\n");
            builder.append("- 120 医疗急救电话\n");
        }
        builder.append("你愿意的话，我可以继续陪你梳理现在最难受的部分，同时帮你准备一段给老师/家人的求助话术。");
        return builder.toString();
    }
}

