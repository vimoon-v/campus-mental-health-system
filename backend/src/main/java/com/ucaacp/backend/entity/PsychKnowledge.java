package com.ucaacp.backend.entity;

import com.ucaacp.backend.entity.DTO.UserDTO;
import com.ucaacp.backend.entity.enums.ReviewStatus;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "psych_knowledge")
public class PsychKnowledge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "knowledge_id")
    private Integer knowledgeId;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "summary", length = 512)
    private String summary;

    @Column(name = "tags", columnDefinition = "TEXT")
    private String tags;

    @Column(name = "cover_image", columnDefinition = "MEDIUMTEXT")
    private String coverImage;

    @Column(name = "category", nullable = false, length = 32)
    private String category = "growth";

    @Column(name = "view_count", nullable = false)
    private Integer viewCount = 0;

    @Column(name = "teacher_publisher_username", nullable = false, length = 45)
    private String teacherPublisherUsername;

    @Column(name = "publish_time", nullable = false, updatable = false)
    private LocalDateTime publishTime = LocalDateTime.now();

    @Column(name = "publish_status", nullable = false, length = 16)
    private String publishStatus = "publish";

    @Column(name = "schedule_time")
    private LocalDateTime scheduleTime;

    @Column(name = "visible_range", length = 16)
    private String visibleRange = "all";

    @Column(name = "allow_comment", nullable = false)
    private Boolean allowComment = true;

    @Column(name = "recommended", nullable = false)
    private Boolean recommended = false;

    @Column(name = "admin_reviewer_username", length = 45)
    private String adminReviewerUsername;

    @Column(name = "review_time")
    private LocalDateTime reviewTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", nullable = false, columnDefinition = "ENUM('PENDING','PASSED','BANNED','REVOKED')")
    private ReviewStatus reviewStatus = ReviewStatus.PENDING;

    // 构造方法
    public PsychKnowledge() {}

    public PsychKnowledge(String title, String content, String teacherPublisherUsername) {
        this.title = title;
        this.content = content;
        this.teacherPublisherUsername = teacherPublisherUsername;
    }

    public PsychKnowledge(String title, String content, String teacherPublisherUsername, String category) {
        this.title = title;
        this.content = content;
        this.teacherPublisherUsername = teacherPublisherUsername;
        this.category = category;
    }
}
