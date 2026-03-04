package com.ucaacp.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "psych_knowledge_like", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"knowledge_id", "username"})
})
public class PsychKnowledgeLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "like_id")
    private Integer likeId;

    @Column(name = "knowledge_id", nullable = false)
    private Integer knowledgeId;

    @Column(name = "username", nullable = false, length = 45)
    private String username;

    @Column(name = "like_time", nullable = false)
    private LocalDateTime likeTime = LocalDateTime.now();

    public PsychKnowledgeLike() {}
}
