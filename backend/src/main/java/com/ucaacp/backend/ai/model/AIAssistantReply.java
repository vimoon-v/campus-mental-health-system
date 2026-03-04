package com.ucaacp.backend.ai.model;

import java.util.List;

public record AIAssistantReply(
        String content,
        boolean crisisDetected,
        List<String> ragSources,
        List<String> hotlines,
        boolean providerUsed
) {
}

