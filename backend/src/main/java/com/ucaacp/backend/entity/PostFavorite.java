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
@Table(name = "post_favorite", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"post_id", "username"})
})
public class PostFavorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "favorite_id")
    private Integer favoriteId;

    @Column(name = "post_id", nullable = false)
    private Integer postId;

    @Column(name = "username", nullable = false, length = 45)
    private String username;

    @Column(name = "favorite_time", nullable = false)
    private LocalDateTime favoriteTime = LocalDateTime.now();

    public PostFavorite() {}
}
