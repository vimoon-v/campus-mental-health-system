package com.ucaacp.backend.entity;


import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "post")
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "post_id")
    private Integer postId;

    @NotNull
    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @NotNull
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @NotNull
    @Column(name = "username", nullable = false, length = 45)
    private String username;


    @NotNull
    @Column(name = "publish_time", nullable = false, updatable = false)
    private LocalDateTime publishTime = LocalDateTime.now();

    @NotNull
    @Column(name = "is_anonymous", nullable = false)
    private Boolean isAnonymous = false;

    @NotNull
    @Column(name = "is_public", nullable = false)
    private Boolean isPublic = true;

    @NotNull
    @Column(name = "need_reply", nullable = false)
    private Boolean needReply = false;

    @NotNull
    @Column(name = "allow_comment", nullable = false)
    private Boolean allowComment = true;

    @NotNull
    @Column(name = "show_in_recommend", nullable = false)
    private Boolean showInRecommend = true;

    @NotNull
    @Column(name = "anonymous_like", nullable = false)
    private Boolean anonymousLike = true;

    @NotNull
    @Column(name = "primary_tag", nullable = false, length = 32)
    private String primaryTag = "其他烦恼";

    // 构造方法
    public Post() {}

}
