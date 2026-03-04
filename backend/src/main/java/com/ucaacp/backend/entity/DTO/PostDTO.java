package com.ucaacp.backend.entity.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostDTO {
    private Integer postId;
    private String title;
    private String content;
    private String displayName;
    private String username;
    private String avatar;
    private Boolean isAnonymous;
    private Boolean isPublic;
    private Boolean needReply;
    private Boolean allowComment;
    private Boolean showInRecommend;
    private Boolean anonymousLike;
    private String primaryTag;
    private LocalDateTime publishTime;
    private Long likeCount;
    private Long favoriteCount;

    public PostDTO(
            Integer postId,
            String title,
            String content,
            String displayName,
            String username,
            String avatar,
            Boolean isAnonymous,
            Boolean isPublic,
            Boolean needReply,
            Boolean allowComment,
            Boolean showInRecommend,
            Boolean anonymousLike,
            String primaryTag,
            LocalDateTime publishTime,
            Long likeCount
    ) {
        this.postId = postId;
        this.title = title;
        this.content = content;
        this.displayName = displayName;
        this.username = username;
        this.avatar = avatar;
        this.isAnonymous = isAnonymous;
        this.isPublic = isPublic;
        this.needReply = needReply;
        this.allowComment = allowComment;
        this.showInRecommend = showInRecommend;
        this.anonymousLike = anonymousLike;
        this.primaryTag = primaryTag;
        this.publishTime = publishTime;
        this.likeCount = likeCount;
        this.favoriteCount = 0L;
    }

}
