package com.ucaacp.backend.entity;


import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "psych_knowledge_report")
public class PsychKnowledgeReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id")
    private Integer reportId;

    @Column(name = "knowledge_id", nullable = false)
    private Integer knowledgeId;

    @Column(name = "report_reason", nullable = false, columnDefinition = "TEXT")
    private String reportReason;

    @Column(name = "report_type", nullable = false, length = 20)
    private String reportType = "其他";

    @Column(name = "reporter_username", length = 50)
    private String reporterUsername;

    @Column(name = "report_time", nullable = false, updatable = false)
    private LocalDateTime reportTime = LocalDateTime.now();

    // 构造方法
    public PsychKnowledgeReport() {}

    public PsychKnowledgeReport(Integer knowledgeId, String reportReason, String reportType, String reporterUsername) {
        this.knowledgeId = knowledgeId;
        this.reportReason = reportReason;
        this.reportType = reportType;
        this.reporterUsername = reporterUsername;
    }
}
