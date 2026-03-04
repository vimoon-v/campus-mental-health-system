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
@Table(name = "psych_test_option")
public class PsychTestOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "option_id")
    private Integer optionId;

    @Column(name = "question_id", nullable = false)
    private Integer questionId;

    @Column(name = "label", nullable = false, length = 255)
    private String label;

    @Column(name = "score")
    private Integer score;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex = 0;
}
