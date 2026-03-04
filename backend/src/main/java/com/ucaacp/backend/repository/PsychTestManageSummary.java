package com.ucaacp.backend.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PsychTestManageSummary {
    private final Integer testId;
    private final String title;
    private final String description;
    private final String category;
    private final String gradeScope;
    private final String status;
    private final Integer durationMinutes;
    private final Integer participants;
    private final BigDecimal passRate;
    private final BigDecimal rating;
    private final LocalDateTime createdAt;
    private final LocalDateTime publishTime;
    private final Long questionsNumber;

    public PsychTestManageSummary(Integer testId,
                                  String title,
                                  String description,
                                  String category,
                                  String gradeScope,
                                  String status,
                                  Integer durationMinutes,
                                  Integer participants,
                                  BigDecimal passRate,
                                  BigDecimal rating,
                                  LocalDateTime createdAt,
                                  LocalDateTime publishTime,
                                  Long questionsNumber) {
        this.testId = testId;
        this.title = title;
        this.description = description;
        this.category = category;
        this.gradeScope = gradeScope;
        this.status = status;
        this.durationMinutes = durationMinutes;
        this.participants = participants;
        this.passRate = passRate;
        this.rating = rating;
        this.createdAt = createdAt;
        this.publishTime = publishTime;
        this.questionsNumber = questionsNumber;
    }

    public Integer getTestId() {
        return testId;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getCategory() {
        return category;
    }

    public String getGradeScope() {
        return gradeScope;
    }

    public String getStatus() {
        return status;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public Integer getParticipants() {
        return participants;
    }

    public BigDecimal getPassRate() {
        return passRate;
    }

    public BigDecimal getRating() {
        return rating;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getPublishTime() {
        return publishTime;
    }

    public Long getQuestionsNumber() {
        return questionsNumber;
    }
}
