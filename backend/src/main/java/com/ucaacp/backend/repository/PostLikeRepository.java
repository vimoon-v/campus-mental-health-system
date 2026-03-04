package com.ucaacp.backend.repository;

import com.ucaacp.backend.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface PostLikeRepository extends JpaRepository<PostLike, Integer> {
    boolean existsByPostIdAndUsername(Integer postId, String username);
    void deleteByPostIdAndUsername(Integer postId, String username);
    long countByPostId(Integer postId);

    @Query("SELECT pl.postId, COUNT(pl.likeId) " +
            "FROM PostLike pl " +
            "WHERE pl.postId IN :postIds " +
            "GROUP BY pl.postId")
    List<Object[]> countGroupedByPostIds(@Param("postIds") Collection<Integer> postIds);
}
