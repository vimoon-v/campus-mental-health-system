package com.ucaacp.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "psych_test_manage")
public class PsychTestManage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "test_id")
    private Integer testId;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "category", nullable = false, length = 32)
    private String category = "personality";

    @Column(name = "grade_scope", nullable = false, length = 16)
    private String gradeScope = "all";

    @Column(name = "status", nullable = false, length = 16)
    private String status = "draft";

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "allow_repeat", nullable = false)
    private Boolean allowRepeat = true;

    @Column(name = "show_result", nullable = false)
    private Boolean showResult = true;

    @Column(name = "auto_warn", nullable = false)
    private Boolean autoWarn = true;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(name = "participants", nullable = false)
    private Integer participants = 0;

    @Column(name = "pass_rate")
    private BigDecimal passRate;

    @Column(name = "rating")
    private BigDecimal rating;

    @Column(name = "teacher_username", nullable = false, length = 45)
    private String teacherUsername;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "publish_time")
    private LocalDateTime publishTime;
}
