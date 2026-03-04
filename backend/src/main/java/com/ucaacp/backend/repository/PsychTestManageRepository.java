package com.ucaacp.backend.repository;

import com.ucaacp.backend.entity.PsychTestManage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PsychTestManageRepository extends JpaRepository<PsychTestManage, Integer> {

    @Query("SELECT new com.ucaacp.backend.repository.PsychTestManageSummary(" +
            "t.testId, t.title, t.description, t.category, t.gradeScope, t.status, t.durationMinutes, " +
            "t.participants, t.passRate, t.rating, t.createdAt, t.publishTime, COUNT(q.questionId)) " +
            "FROM PsychTestManage t " +
            "LEFT JOIN PsychTestQuestion q ON q.testId = t.testId " +
            "GROUP BY t.testId, t.title, t.description, t.category, t.gradeScope, t.status, t.durationMinutes, " +
            "t.participants, t.passRate, t.rating, t.createdAt, t.publishTime " +
            "ORDER BY t.createdAt DESC")
    List<PsychTestManageSummary> findAllSummaries();
}
