package com.ucaacp.backend.repository;

import com.ucaacp.backend.entity.PostFavorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface PostFavoriteRepository extends JpaRepository<PostFavorite, Integer> {
    boolean existsByPostIdAndUsername(Integer postId, String username);
    void deleteByPostIdAndUsername(Integer postId, String username);

    long countByPostId(Integer postId);

    @Query("SELECT pf.postId, COUNT(pf.favoriteId) " +
            "FROM PostFavorite pf " +
            "WHERE pf.postId IN :postIds " +
            "GROUP BY pf.postId")
    List<Object[]> countGroupedByPostIds(@Param("postIds") Collection<Integer> postIds);
}
