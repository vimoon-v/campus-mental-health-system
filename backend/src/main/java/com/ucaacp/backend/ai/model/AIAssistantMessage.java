package com.ucaacp.backend.ai.model;

import java.time.LocalDateTime;

public record AIAssistantMessage(
        String role,
        String content,
        LocalDateTime timestamp
) {
}

