package com.ucaacp.backend.ai.service;

import com.ucaacp.backend.ai.model.AIAssistantMessage;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AIAssistantConversationService {

    private final Map<String, Deque<AIAssistantMessage>> conversations = new ConcurrentHashMap<>();

    public List<AIAssistantMessage> snapshot(String username, String conversationId, int maxMessages) {
        Deque<AIAssistantMessage> deque = conversations.get(buildKey(username, conversationId));
        if (deque == null || deque.isEmpty()) {
            return List.of();
        }
        List<AIAssistantMessage> all = new ArrayList<>(deque);
        if (maxMessages <= 0 || all.size() <= maxMessages) {
            return all;
        }
        return all.subList(all.size() - maxMessages, all.size());
    }

    public void append(String username, String conversationId, String role, String content, int maxMessages) {
        String normalizedContent = content == null ? "" : content.trim();
        if (normalizedContent.isBlank()) {
            return;
        }
        String normalizedRole = normalizeRole(role);
        String key = buildKey(username, conversationId);
        Deque<AIAssistantMessage> deque = conversations.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        synchronized (deque) {
            deque.addLast(new AIAssistantMessage(normalizedRole, normalizedContent, LocalDateTime.now()));
            trimToLimit(deque, maxMessages);
        }
    }

    public void clear(String username, String conversationId) {
        conversations.remove(buildKey(username, conversationId));
    }

    public int clearAllForUser(String username) {
        if (username == null || username.isBlank()) {
            return 0;
        }
        String prefix = username.trim() + "::";
        int cleared = 0;
        for (String key : new ArrayList<>(conversations.keySet())) {
            if (key.startsWith(prefix)) {
                if (conversations.remove(key) != null) {
                    cleared += 1;
                }
            }
        }
        return cleared;
    }

    private String normalizeRole(String role) {
        if (Objects.equals("assistant", role)) {
            return "assistant";
        }
        return "user";
    }

    private void trimToLimit(Deque<AIAssistantMessage> deque, int maxMessages) {
        if (maxMessages <= 0) {
            while (deque.size() > 60) {
                deque.pollFirst();
            }
            return;
        }
        while (deque.size() > maxMessages) {
            deque.pollFirst();
        }
    }

    private String buildKey(String username, String conversationId) {
        String safeUser = username == null ? "" : username.trim();
        String safeConversation = conversationId == null || conversationId.trim().isEmpty()
                ? "default"
                : conversationId.trim();
        return safeUser + "::" + safeConversation;
    }
}

