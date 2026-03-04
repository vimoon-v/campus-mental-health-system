package com.ucaacp.backend.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@ConfigurationProperties(prefix = "ai.assistant")
public class AIAssistantProperties {

    private boolean enabled = true;
    private boolean providerEnabled = false;
    private String providerBaseUrl = "https://api.openai.com";
    private String apiKey = "";
    private String model = "gpt-4o-mini";
    private double temperature = 0.6;
    private int maxHistoryMessages = 16;
    private int maxResponseChars = 1200;
    private int streamDelayMs = 20;
    private int ragTopK = 3;
    private List<String> crisisHotlines = new ArrayList<>(List.of(
            "110 公安报警电话",
            "120 医疗急救电话",
            "请联系本校心理中心值班电话"
    ));

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isProviderEnabled() {
        return providerEnabled;
    }

    public void setProviderEnabled(boolean providerEnabled) {
        this.providerEnabled = providerEnabled;
    }

    public String getProviderBaseUrl() {
        return providerBaseUrl;
    }

    public void setProviderBaseUrl(String providerBaseUrl) {
        this.providerBaseUrl = providerBaseUrl;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public double getTemperature() {
        return temperature;
    }

    public void setTemperature(double temperature) {
        this.temperature = temperature;
    }

    public int getMaxHistoryMessages() {
        return maxHistoryMessages;
    }

    public void setMaxHistoryMessages(int maxHistoryMessages) {
        this.maxHistoryMessages = maxHistoryMessages;
    }

    public int getMaxResponseChars() {
        return maxResponseChars;
    }

    public void setMaxResponseChars(int maxResponseChars) {
        this.maxResponseChars = maxResponseChars;
    }

    public int getStreamDelayMs() {
        return streamDelayMs;
    }

    public void setStreamDelayMs(int streamDelayMs) {
        this.streamDelayMs = streamDelayMs;
    }

    public int getRagTopK() {
        return ragTopK;
    }

    public void setRagTopK(int ragTopK) {
        this.ragTopK = ragTopK;
    }

    public List<String> getCrisisHotlines() {
        return crisisHotlines;
    }

    public void setCrisisHotlines(List<String> crisisHotlines) {
        this.crisisHotlines = crisisHotlines == null ? new ArrayList<>() : crisisHotlines;
    }
}

