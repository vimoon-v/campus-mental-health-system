package com.ucaacp.backend.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucaacp.backend.ai.AIAssistantProperties;
import com.ucaacp.backend.ai.model.AIAssistantMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AIAssistantLLMClient {

    private static final Logger log = LoggerFactory.getLogger(AIAssistantLLMClient.class);

    private final AIAssistantProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public AIAssistantLLMClient(AIAssistantProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public Optional<String> generate(String systemPrompt, List<AIAssistantMessage> history, String userMessage) {
        if (!isProviderConfigured()) {
            return Optional.empty();
        }
        try {
            List<Map<String, String>> messages = buildMessages(systemPrompt, history, userMessage);
            Map<String, Object> requestBody = new LinkedHashMap<>();
            requestBody.put("model", properties.getModel());
            requestBody.put("stream", false);
            requestBody.put("temperature", properties.getTemperature());
            requestBody.put("messages", messages);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(buildChatCompletionsUri(properties.getProviderBaseUrl()))
                    .timeout(Duration.ofSeconds(60))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + properties.getApiKey().trim())
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody), StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn(
                        "AI provider response status not successful: {}, body: {}",
                        response.statusCode(),
                        abbreviate(response.body(), 240)
                );
                return Optional.empty();
            }
            JsonNode root = objectMapper.readTree(response.body());
            String content = extractContent(root.path("choices").path(0).path("message").path("content"));
            if (content == null || content.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(content.trim());
        } catch (Exception e) {
            log.warn("AI provider call failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private boolean isProviderConfigured() {
        return properties.isEnabled()
                && properties.isProviderEnabled()
                && properties.getProviderBaseUrl() != null
                && !properties.getProviderBaseUrl().isBlank()
                && properties.getApiKey() != null
                && !properties.getApiKey().isBlank()
                && properties.getModel() != null
                && !properties.getModel().isBlank();
    }

    private List<Map<String, String>> buildMessages(
            String systemPrompt,
            List<AIAssistantMessage> history,
            String userMessage
    ) {
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(buildMessage("system", systemPrompt));
        if (history != null) {
            for (AIAssistantMessage msg : history) {
                if (msg == null || msg.content() == null || msg.content().isBlank()) {
                    continue;
                }
                String role = "assistant".equals(msg.role()) ? "assistant" : "user";
                messages.add(buildMessage(role, msg.content()));
            }
        }
        messages.add(buildMessage("user", userMessage));
        return messages;
    }

    private Map<String, String> buildMessage(String role, String content) {
        Map<String, String> message = new LinkedHashMap<>();
        message.put("role", role);
        message.put("content", content == null ? "" : content);
        return message;
    }

    private String normalizeBaseUrl(String value) {
        String normalized = value.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private URI buildChatCompletionsUri(String baseUrl) {
        String normalized = normalizeBaseUrl(baseUrl);
        if (normalized.endsWith("/v1")) {
            return URI.create(normalized + "/chat/completions");
        }
        return URI.create(normalized + "/v1/chat/completions");
    }

    private String extractContent(JsonNode contentNode) {
        if (contentNode == null || contentNode.isMissingNode() || contentNode.isNull()) {
            return "";
        }
        if (contentNode.isTextual()) {
            return contentNode.asText("");
        }
        if (contentNode.isArray()) {
            StringBuilder builder = new StringBuilder();
            for (JsonNode item : contentNode) {
                if (item == null || item.isNull()) {
                    continue;
                }
                if (item.isTextual()) {
                    builder.append(item.asText(""));
                    continue;
                }
                String text = item.path("text").asText("");
                if (!text.isBlank()) {
                    builder.append(text);
                    continue;
                }
                String nestedText = item.path("content").path("text").asText("");
                if (!nestedText.isBlank()) {
                    builder.append(nestedText);
                }
            }
            return builder.toString();
        }
        return contentNode.path("text").asText("");
    }

    private String abbreviate(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        if (maxLength <= 0 || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength) + "...";
    }
}
