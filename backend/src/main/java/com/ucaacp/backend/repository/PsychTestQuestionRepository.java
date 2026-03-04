package com.ucaacp.backend.repository;

import com.ucaacp.backend.entity.PsychTestQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PsychTestQuestionRepository extends JpaRepository<PsychTestQuestion, Integer> {
    List<PsychTestQuestion> findByTestIdOrderByOrderIndexAsc(Integer testId);
    long countByTestId(Integer testId);
}
