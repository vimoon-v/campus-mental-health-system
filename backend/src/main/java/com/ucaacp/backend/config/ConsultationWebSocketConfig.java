package com.ucaacp.backend.config;

import com.ucaacp.backend.websocket.ConsultationWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor;

@Configuration
@EnableWebSocket
public class ConsultationWebSocketConfig implements WebSocketConfigurer {

    private final ConsultationWebSocketHandler consultationWebSocketHandler;

    public ConsultationWebSocketConfig(ConsultationWebSocketHandler consultationWebSocketHandler) {
        this.consultationWebSocketHandler = consultationWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(consultationWebSocketHandler, "/ws/consultation")
                .addInterceptors(new HttpSessionHandshakeInterceptor())
                .setAllowedOriginPatterns("*");
    }
}
