package com.ucaacp.backend.repository;

import com.ucaacp.backend.entity.PsychTestOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PsychTestOptionRepository extends JpaRepository<PsychTestOption, Integer> {
    List<PsychTestOption> findByQuestionIdOrderByOrderIndexAsc(Integer questionId);
    void deleteByQuestionId(Integer questionId);
}
