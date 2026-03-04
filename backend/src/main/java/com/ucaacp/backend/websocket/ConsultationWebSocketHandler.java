package com.ucaacp.backend.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class ConsultationWebSocketHandler extends TextWebSocketHandler {

    private final ConsultationWebSocketSessionRegistry sessionRegistry;

    public ConsultationWebSocketHandler(ConsultationWebSocketSessionRegistry sessionRegistry) {
        this.sessionRegistry = sessionRegistry;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessionRegistry.register(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessionRegistry.unregister(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String payload = message.getPayload() == null ? "" : message.getPayload().trim();
        if ("ping".equalsIgnoreCase(payload) && session.isOpen()) {
            try {
                session.sendMessage(new TextMessage("{\"event\":\"pong\"}"));
            } catch (Exception ignored) {
            }
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        sessionRegistry.unregister(session);
        try {
            session.close();
        } catch (Exception ignored) {
        }
    }
}
