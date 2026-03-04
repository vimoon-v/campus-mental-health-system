package com.ucaacp.backend.entity.DTO;

import com.ucaacp.backend.entity.enums.ReviewStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PsychKnowledgeDTO {
    private Integer knowledgeId;
    private String title;
    private String content;
    private String summary;
    private String tags;
    private String coverImage;
    private String category;
    private Integer viewCount;
    private Long likeCount;
    private Boolean liked;
    private String teacherPublisherUsername;
    private String teacherPublisherDisplayName;
    private String teacherPublisherAvatar;
    private LocalDateTime publishTime = LocalDateTime.now();
    private String publishStatus;
    private LocalDateTime scheduleTime;
    private String visibleRange;
    private Boolean allowComment;
    private Boolean recommended;
    private String adminReviewerUsername;
    private LocalDateTime reviewTime;
    private ReviewStatus reviewStatus = ReviewStatus.PENDING;

    public PsychKnowledgeDTO(
            Integer knowledgeId,
            String title,
            String content,
            String summary,
            String tags,
            String coverImage,
            String category,
            Integer viewCount,
            String teacherPublisherUsername,
            String teacherPublisherDisplayName,
            String teacherPublisherAvatar,
            LocalDateTime publishTime,
            String publishStatus,
            LocalDateTime scheduleTime,
            String visibleRange,
            Boolean allowComment,
            Boolean recommended,
            String adminReviewerUsername,
            LocalDateTime reviewTime,
            ReviewStatus reviewStatus
    ) {
        this.knowledgeId = knowledgeId;
        this.title = title;
        this.content = content;
        this.summary = summary;
        this.tags = tags;
        this.coverImage = coverImage;
        this.category = category;
        this.viewCount = viewCount;
        this.likeCount = 0L;
        this.liked = false;
        this.teacherPublisherUsername = teacherPublisherUsername;
        this.teacherPublisherDisplayName = teacherPublisherDisplayName;
        this.teacherPublisherAvatar = teacherPublisherAvatar;
        this.publishTime = publishTime;
        this.publishStatus = publishStatus;
        this.scheduleTime = scheduleTime;
        this.visibleRange = visibleRange;
        this.allowComment = allowComment;
        this.recommended = recommended;
        this.adminReviewerUsername = adminReviewerUsername;
        this.reviewTime = reviewTime;
        this.reviewStatus = reviewStatus;
    }
}
