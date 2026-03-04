package com.ucaacp.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "psych_test_question")
public class PsychTestQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "question_id")
    private Integer questionId;

    @Column(name = "test_id", nullable = false)
    private Integer testId;

    @Column(name = "title", nullable = false, columnDefinition = "TEXT")
    private String title;

    @Column(name = "type", nullable = false, length = 16)
    private String type = "single";

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex = 0;
}
