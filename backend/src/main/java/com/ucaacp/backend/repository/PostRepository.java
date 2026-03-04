package com.ucaacp.backend.repository;

import com.ucaacp.backend.entity.Post;
import com.ucaacp.backend.entity.DTO.PostDTO;
import com.ucaacp.backend.entity.DTO.ReplyDTO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Integer> {


    @Query("SELECT new com.ucaacp.backend.entity.DTO.PostDTO(" +
            "p.postId, p.title, p.content, " +
            "CASE " +
            "   WHEN p.isAnonymous = true THEN '匿名用户' " +
            "   WHEN u.nickname IS NOT NULL AND u.nickname != '' THEN u.nickname " +
            "   ELSE u.username " +
            "END, " +
            "CASE " +
            "   WHEN p.isAnonymous = true THEN NULL " +
            "   ELSE u.username " +
            "END, " +
            "u.avatar, p.isAnonymous, p.isPublic, false, true, true, true, p.primaryTag, p.publishTime, COUNT(pl.likeId))  " +
            "FROM Post p " +
            "JOIN User u ON u.username=p.username " +
            "LEFT JOIN PostLike pl ON pl.postId = p.postId " +
            "WHERE p.isPublic = true " +
            "GROUP BY p.postId, p.title, p.content, p.isAnonymous, p.isPublic, p.primaryTag, p.publishTime, u.nickname, u.username, u.avatar " +
            "ORDER BY p.publishTime DESC")
    List<PostDTO> findPublicPosts();


    @Query("SELECT new com.ucaacp.backend.entity.DTO.PostDTO(" +
            "p.postId, p.title, p.content, " +
            "CASE " +
            "   WHEN p.isAnonymous = true THEN '匿名用户' " +
            "   WHEN u.nickname IS NOT NULL AND u.nickname != '' THEN u.nickname " +
            "   ELSE u.username " +
            "END, " +
            "CASE " +
            "   WHEN p.isAnonymous = true THEN NULL " +
            "   ELSE u.username " +
            "END, " +
            "u.avatar, p.isAnonymous, p.isPublic, false, true, true, true, p.primaryTag, p.publishTime, 0L)  " +
            "FROM Post p " +
            "JOIN User u ON u.username=p.username " +
            "WHERE p.isPublic = true " +
            "AND EXISTS (SELECT pr.reportId FROM PostReport pr WHERE pr.postId = p.postId) " +
            "ORDER BY p.publishTime DESC")
    List<PostDTO> findReportedPosts();


    @Query("SELECT new com.ucaacp.backend.entity.DTO.PostDTO(" +
            "p.postId, p.title, p.content, " +
            "CASE " +
            "   WHEN p.isAnonymous = true THEN '匿名用户' " +
            "   WHEN u.nickname IS NOT NULL AND u.nickname != '' THEN u.nickname " +
            "   ELSE u.username " +
            "END, " +
            "CASE " +
            "   WHEN p.isAnonymous = true THEN NULL " +
            "   ELSE u.username " +
            "END, " +
            "u.avatar, p.isAnonymous, p.isPublic, false, true, true, true, p.primaryTag, p.publishTime, COUNT(pl.likeId))  " +
            "FROM Post p " +
            "JOIN User u ON u.username=p.username " +
            "LEFT JOIN PostLike pl ON pl.postId = p.postId " +
            "WHERE p.username = :username " +
            "GROUP BY p.postId, p.title, p.content, p.isAnonymous, p.isPublic, p.primaryTag, p.publishTime, u.nickname, u.username, u.avatar " +
            "ORDER BY p.publishTime DESC")
    List<PostDTO> findPostsByUsername(@Param("username") String username);

    @Query("SELECT new com.ucaacp.backend.entity.DTO.PostDTO(" +
            "p.postId, p.title, p.content, " +
            "CASE " +
            "   WHEN p.isAnonymous = true THEN '匿名用户' " +
            "   WHEN u.nickname IS NOT NULL AND u.nickname != '' THEN u.nickname " +
            "   ELSE u.username " +
            "END, " +
            "CASE " +
            "   WHEN p.isAnonymous = true THEN NULL " +
            "   ELSE u.username " +
            "END, " +
            "u.avatar, p.isAnonymous, p.isPublic, false, true, true, true, p.primaryTag, p.publishTime, COUNT(pl.likeId))  " +
            "FROM Post p " +
            "JOIN User u ON u.username=p.username " +
            "JOIN PostFavorite pf ON pf.postId = p.postId " +
            "LEFT JOIN PostLike pl ON pl.postId = p.postId " +
            "WHERE p.isPublic = true " +
            "AND pf.username = :username " +
            "GROUP BY p.postId, p.title, p.content, p.isAnonymous, p.isPublic, p.primaryTag, p.publishTime, u.nickname, u.username, u.avatar " +
            "ORDER BY p.publishTime DESC")
    List<PostDTO> findFavoritePostsByUsername(@Param("username") String username);




    @Query("SELECT new com.ucaacp.backend.entity.DTO.ReplyDTO(r.replyId, r.content, r.postId, " +
            "       CASE WHEN u.nickname IS NOT NULL AND u.nickname != '' THEN u.nickname " +
            "            ELSE u.username" +
            "           END," +
            "       r.username, u.avatar, r.replyTime, r.parentReplyId, " +
            "       CASE WHEN pu.nickname IS NOT NULL AND pu.nickname != '' THEN pu.nickname " +
            "            WHEN pu.username IS NOT NULL THEN pu.username " +
            "            ELSE NULL " +
            "       END) " +
            "FROM Reply r JOIN User u ON r.username = u.username " +
            "LEFT JOIN Reply pr ON r.parentReplyId = pr.replyId " +
            "LEFT JOIN User pu ON pr.username = pu.username " +
            "WHERE r.postId=:postId "+
            "ORDER BY r.replyTime DESC")
    List<ReplyDTO> findRepliesByPostId(@Param("postId") Integer postId);


}
