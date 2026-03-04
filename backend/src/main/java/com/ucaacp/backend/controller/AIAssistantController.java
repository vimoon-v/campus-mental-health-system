package com.ucaacp.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucaacp.backend.ai.AIAssistantProperties;
import com.ucaacp.backend.ai.model.AIAssistantReply;
import com.ucaacp.backend.ai.service.AIAssistantService;
import com.ucaacp.backend.annotation.CheckLogin;
import com.ucaacp.backend.entity.User;
import com.ucaacp.backend.utils.return_object.ReturnObject;
import jakarta.annotation.PreDestroy;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@RestController
@RequestMapping("/api/ai_assistant")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class AIAssistantController {

    private final AIAssistantService aiAssistantService;
    private final AIAssistantProperties aiAssistantProperties;
    private final ObjectMapper objectMapper;
    private final ExecutorService streamExecutor = Executors.newCachedThreadPool();

    public AIAssistantController(
            AIAssistantService aiAssistantService,
            AIAssistantProperties aiAssistantProperties,
            ObjectMapper objectMapper
    ) {
        this.aiAssistantService = aiAssistantService;
        this.aiAssistantProperties = aiAssistantProperties;
        this.objectMapper = objectMapper;
    }

    @CheckLogin
    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chatStream(@RequestBody Map<String, Object> requestBody, HttpSession session) {
        SseEmitter emitter = new SseEmitter(0L);
        String username = getSessionUsername(session);
        if (username == null || username.isBlank()) {
            streamExecutor.execute(() -> {
                sendEvent(emitter, "error", Map.of("message", "用户未登录"));
                emitter.complete();
            });
            return emitter;
        }

        String message = safeString(requestBody.get("message")).trim();
        String conversationId = safeString(requestBody.get("conversationId")).trim();
        if (conversationId.isBlank()) {
            conversationId = "conv-" + UUID.randomUUID();
        }
        if (message.isBlank()) {
            final String finalConversationId = conversationId;
            streamExecutor.execute(() -> {
                sendEvent(emitter, "meta", Map.of("conversationId", finalConversationId));
                sendEvent(emitter, "error", Map.of("message", "消息内容不能为空"));
                sendEvent(emitter, "done", Map.of("conversationId", finalConversationId, "content", ""));
                emitter.complete();
            });
            return emitter;
        }

        final String finalConversationId = conversationId;
        streamExecutor.execute(() -> {
            try {
                if (!aiAssistantProperties.isEnabled()) {
                    sendEvent(emitter, "meta", Map.of("conversationId", finalConversationId));
                    sendEvent(emitter, "error", Map.of("message", "AI心理助手暂未开启"));
                    sendEvent(emitter, "done", Map.of("conversationId", finalConversationId, "content", ""));
                    emitter.complete();
                    return;
                }

                AIAssistantReply reply = aiAssistantService.chat(username, finalConversationId, message);
                sendEvent(emitter, "meta", Map.of(
                        "conversationId", finalConversationId,
                        "ragSources", reply.ragSources(),
                        "providerUsed", reply.providerUsed(),
                        "crisis", reply.crisisDetected()
                ));

                String content = reply.content() == null ? "" : reply.content();
                for (int i = 0; i < content.length(); i++) {
                    sendEvent(emitter, "delta", Map.of("content", String.valueOf(content.charAt(i))));
                    sleepTypingDelay(aiAssistantProperties.getStreamDelayMs());
                }

                if (reply.crisisDetected()) {
                    sendEvent(emitter, "crisis", Map.of(
                            "message", "检测到高风险情绪，请优先寻求线下帮助。",
                            "hotlines", reply.hotlines()
                    ));
                }

                sendEvent(emitter, "done", Map.of(
                        "conversationId", finalConversationId,
                        "content", content,
                        "ragSources", reply.ragSources(),
                        "providerUsed", reply.providerUsed(),
                        "crisis", reply.crisisDetected()
                ));
                emitter.complete();
            } catch (Exception e) {
                sendEvent(emitter, "error", Map.of("message", "AI助手服务异常: " + e.getMessage()));
                emitter.completeWithError(e);
            }
        });
        return emitter;
    }

    @CheckLogin
    @PostMapping("/memory/clear")
    public ReturnObject clearMemory(@RequestBody(required = false) Map<String, Object> requestBody, HttpSession session) {
        String username = getSessionUsername(session);
        if (username == null || username.isBlank()) {
            return ReturnObject.fail("用户未登录");
        }
        String conversationId = requestBody == null ? "" : safeString(requestBody.get("conversationId"));
        aiAssistantService.clearConversation(username, conversationId);
        Map<String, Object> data = new HashMap<>();
        data.put("conversationId", conversationId == null ? "" : conversationId.trim());
        return ReturnObject.success("对话记忆已清空", data);
    }

    private String getSessionUsername(HttpSession session) {
        Object userObj = session.getAttribute("user");
        if (userObj instanceof User user) {
            return user.getUsername();
        }
        return null;
    }

    private String safeString(Object value) {
        return value == null ? "" : value.toString();
    }

    private void sendEvent(SseEmitter emitter, String eventName, Object payload) {
        try {
            emitter.send(
                    SseEmitter.event()
                            .name(eventName)
                            .data(objectMapper.writeValueAsString(payload))
            );
        } catch (IOException ignored) {
        }
    }

    private void sleepTypingDelay(int delayMs) {
        if (delayMs <= 0) {
            return;
        }
        try {
            Thread.sleep(delayMs);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
    }

    @PreDestroy
    public void destroy() {
        streamExecutor.shutdownNow();
    }
}

