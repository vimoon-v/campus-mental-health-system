package com.ucaacp.backend.ai.service;

import com.ucaacp.backend.ai.AIAssistantProperties;
import com.ucaacp.backend.ai.model.AIAssistantMessage;
import com.ucaacp.backend.ai.model.AIAssistantReply;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class AIAssistantService {

    private final AIAssistantProperties properties;
    private final AIAssistantConversationService conversationService;
    private final AIAssistantCrisisService crisisService;
    private final AIAssistantRagService ragService;
    private final AIAssistantLLMClient llmClient;

    public AIAssistantService(
            AIAssistantProperties properties,
            AIAssistantConversationService conversationService,
            AIAssistantCrisisService crisisService,
            AIAssistantRagService ragService,
            AIAssistantLLMClient llmClient
    ) {
        this.properties = properties;
        this.conversationService = conversationService;
        this.crisisService = crisisService;
        this.ragService = ragService;
        this.llmClient = llmClient;
    }

    public AIAssistantReply chat(String username, String conversationId, String userMessage) {
        String normalizedMessage = normalizeInput(userMessage);
        List<AIAssistantMessage> history = conversationService.snapshot(
                username,
                conversationId,
                properties.getMaxHistoryMessages()
        );
        List<AIAssistantRagService.RagChunk> ragChunks = ragService.retrieve(
                normalizedMessage,
                properties.getRagTopK()
        );
        List<String> ragSources = ragChunks.stream()
                .map(AIAssistantRagService.RagChunk::title)
                .collect(Collectors.toList());

        boolean crisisDetected = crisisService.isCrisisDetected(normalizedMessage);
        String answer;
        boolean providerUsed = false;
        List<String> hotlines = crisisDetected ? new ArrayList<>(properties.getCrisisHotlines()) : List.of();

        if (crisisDetected) {
            answer = crisisService.buildCrisisResponse(hotlines);
        } else {
            String systemPrompt = buildSystemPrompt(ragChunks);
            Optional<String> llmAnswer = llmClient.generate(systemPrompt, history, normalizedMessage);
            if (llmAnswer.isPresent()) {
                answer = llmAnswer.get();
                providerUsed = true;
            } else {
                answer = buildFallbackAnswer(normalizedMessage, ragChunks);
            }
        }

        String normalizedAnswer = truncate(answer, properties.getMaxResponseChars());
        conversationService.append(username, conversationId, "user", normalizedMessage, properties.getMaxHistoryMessages());
        conversationService.append(username, conversationId, "assistant", normalizedAnswer, properties.getMaxHistoryMessages());

        return new AIAssistantReply(
                normalizedAnswer,
                crisisDetected,
                ragSources,
                hotlines,
                providerUsed
        );
    }

    public void clearConversation(String username, String conversationId) {
        if (conversationId == null || conversationId.trim().isEmpty()) {
            conversationService.clearAllForUser(username);
            return;
        }
        conversationService.clear(username, conversationId);
    }

    private String buildSystemPrompt(List<AIAssistantRagService.RagChunk> ragChunks) {
        StringBuilder builder = new StringBuilder();
        builder.append("你是高校心理支持助手，回答需要温和、尊重、非评判。")
                .append("你不能提供医疗诊断，也不能鼓励任何自伤行为。")
                .append("优先给出可执行的小步骤和校园场景可落地建议。");
        String ragContext = ragService.buildRagContext(ragChunks);
        if (!ragContext.isBlank()) {
            builder.append("\n").append(ragContext);
        }
        return builder.toString();
    }

    private String buildFallbackAnswer(String userMessage, List<AIAssistantRagService.RagChunk> ragChunks) {
        StringBuilder answer = new StringBuilder();
        answer.append("谢谢你愿意说出来。先给自己一点空间，你现在的感受是可以被理解的。\n");
        answer.append("你可以先做一个 3 分钟的稳定练习：缓慢吸气 4 秒、停 4 秒、呼气 6 秒，重复 6 轮。\n");
        answer.append("然后试着把当前压力拆成三件小事，只处理“今天最小的一步”。\n");

        if (!ragChunks.isEmpty()) {
            answer.append("\n结合校内心理知识库，你可以参考：\n");
            for (int i = 0; i < Math.min(2, ragChunks.size()); i++) {
                AIAssistantRagService.RagChunk chunk = ragChunks.get(i);
                answer.append(i + 1)
                        .append(". ")
                        .append(chunk.title())
                        .append("：")
                        .append(chunk.excerpt())
                        .append('\n');
            }
        }

        String normalized = userMessage.toLowerCase(Locale.ROOT);
        if (normalized.contains("考试") || normalized.contains("考研") || normalized.contains("成绩")) {
            answer.append("\n如果是考试/成绩压力，建议把目标拆成“本周可完成”的复习块，并给每块设置完成标准。");
        } else if (normalized.contains("失眠") || normalized.contains("睡不着")) {
            answer.append("\n如果近期睡眠受影响，今晚先减少临睡前刷屏，固定上床时间，先恢复节律。");
        } else if (normalized.contains("宿舍") || normalized.contains("人际") || normalized.contains("关系")) {
            answer.append("\n如果是人际冲突，优先用“我感到……我需要……”表达，避免贴标签式沟通。");
        }

        answer.append("\n如果你愿意，我可以继续和你一起把下一步计划写成可执行清单。");
        return answer.toString();
    }

    private String normalizeInput(String message) {
        if (message == null) {
            return "";
        }
        String normalized = message.trim();
        if (normalized.length() > 2000) {
            return normalized.substring(0, 2000);
        }
        return normalized;
    }

    private String truncate(String value, int maxChars) {
        if (value == null) {
            return "";
        }
        if (maxChars <= 0 || value.length() <= maxChars) {
            return value;
        }
        return value.substring(0, maxChars);
    }
}

