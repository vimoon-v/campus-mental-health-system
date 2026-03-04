package com.ucaacp.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Entity
@Table(name = "psych_test_meta")
public class PsychTestMeta {

    @Id
    @Column(name = "class_name", length = 50, nullable = false)
    private String className;

    @Column(name = "category", length = 32, nullable = false)
    private String category = "personality";

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "rating")
    private BigDecimal rating;
}
