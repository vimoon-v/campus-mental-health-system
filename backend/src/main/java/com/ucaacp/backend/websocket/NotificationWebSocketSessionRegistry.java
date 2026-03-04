package com.ucaacp.backend.websocket;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucaacp.backend.entity.SystemNotification;
import com.ucaacp.backend.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class NotificationWebSocketSessionRegistry {

    private static final Logger log = LoggerFactory.getLogger(NotificationWebSocketSessionRegistry.class);

    private final ObjectMapper objectMapper;
    private final Map<String, Set<WebSocketSession>> usernameSessions = new ConcurrentHashMap<>();
    private final Map<String, String> sessionUser = new ConcurrentHashMap<>();

    public NotificationWebSocketSessionRegistry(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void register(WebSocketSession session) {
        String username = resolveUsername(session);
        if (username == null || username.isBlank()) {
            closeQuietly(session);
            return;
        }
        usernameSessions.computeIfAbsent(username, ignored -> ConcurrentHashMap.newKeySet()).add(session);
        sessionUser.put(session.getId(), username);
    }

    public void unregister(WebSocketSession session) {
        if (session == null) {
            return;
        }
        String username = sessionUser.remove(session.getId());
        if (username == null) {
            return;
        }
        Set<WebSocketSession> sessions = usernameSessions.get(username);
        if (sessions == null) {
            return;
        }
        sessions.remove(session);
        if (sessions.isEmpty()) {
            usernameSessions.remove(username);
        }
    }

    public void sendUnreadCount(String recipientUsername, long unreadCount) {
        if (recipientUsername == null || recipientUsername.isBlank()) {
            return;
        }
        sendEvent(
                recipientUsername,
                Map.of(
                        "event", "unread_count",
                        "unreadCount", unreadCount
                )
        );
    }

    public void sendNotification(SystemNotification notification, long unreadCount) {
        if (notification == null || notification.getRecipientUsername() == null || notification.getRecipientUsername().isBlank()) {
            return;
        }
        Map<String, Object> notificationData = new LinkedHashMap<>();
        notificationData.put("notificationId", notification.getNotificationId());
        notificationData.put("recipientUsername", notification.getRecipientUsername());
        notificationData.put("senderUsername", notification.getSenderUsername());
        notificationData.put("senderDisplayName", notification.getSenderDisplayName());
        notificationData.put("notificationType", notification.getNotificationType() == null ? "SYSTEM" : notification.getNotificationType().name());
        notificationData.put("title", notification.getTitle());
        notificationData.put("content", notification.getContent());
        notificationData.put("relatedType", notification.getRelatedType());
        notificationData.put("relatedId", notification.getRelatedId());
        notificationData.put("isRead", Boolean.TRUE.equals(notification.getIsRead()));
        notificationData.put("createdTime", notification.getCreatedTime() == null ? null : notification.getCreatedTime().toString());

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("event", "notification");
        payload.put("unreadCount", unreadCount);
        payload.put("notification", notificationData);

        sendEvent(
                notification.getRecipientUsername(),
                payload
        );
    }

    private void sendEvent(String recipientUsername, Object payload) {
        Set<WebSocketSession> sessions = usernameSessions.get(recipientUsername);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }
        String messageText;
        try {
            messageText = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            log.warn("序列化通知 WebSocket 消息失败: {}", e.getMessage());
            return;
        }

        TextMessage message = new TextMessage(messageText);
        sessions.removeIf(session -> !session.isOpen());
        for (WebSocketSession session : sessions) {
            try {
                synchronized (session) {
                    session.sendMessage(message);
                }
            } catch (IOException e) {
                log.warn("发送通知 WebSocket 消息失败(session={}): {}", session.getId(), e.getMessage());
                closeQuietly(session);
                unregister(session);
            }
        }
    }

    private String resolveUsername(WebSocketSession session) {
        if (session == null) {
            return null;
        }
        Object userObj = session.getAttributes().get("user");
        if (userObj instanceof User user) {
            return user.getUsername();
        }
        if (userObj instanceof Map<?, ?> userMap) {
            Object usernameObj = userMap.get("username");
            if (usernameObj != null) {
                return usernameObj.toString();
            }
        }
        Object usernameObj = session.getAttributes().get("username");
        return usernameObj == null ? null : usernameObj.toString();
    }

    private void closeQuietly(WebSocketSession session) {
        if (session == null) {
            return;
        }
        try {
            session.close();
        } catch (IOException ignored) {
        }
    }
}
