package com.ucaacp.backend.repository;

import com.ucaacp.backend.entity.PsychKnowledgeLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface PsychKnowledgeLikeRepository extends JpaRepository<PsychKnowledgeLike, Integer> {
    boolean existsByKnowledgeIdAndUsername(Integer knowledgeId, String username);
    void deleteByKnowledgeIdAndUsername(Integer knowledgeId, String username);
    long countByKnowledgeId(Integer knowledgeId);
    @Query("SELECT kl.knowledgeId FROM PsychKnowledgeLike kl WHERE kl.username = :username AND kl.knowledgeId IN :knowledgeIds")
    List<Integer> findLikedKnowledgeIdsByUsernameAndKnowledgeIds(
            @Param("username") String username,
            @Param("knowledgeIds") Collection<Integer> knowledgeIds
    );

    @Query("SELECT kl.knowledgeId, COUNT(kl.likeId) " +
            "FROM PsychKnowledgeLike kl " +
            "WHERE kl.knowledgeId IN :knowledgeIds " +
            "GROUP BY kl.knowledgeId")
    List<Object[]> countGroupedByKnowledgeIds(@Param("knowledgeIds") Collection<Integer> knowledgeIds);
}
