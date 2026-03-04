package com.ucaacp.backend.service;

import com.ucaacp.backend.entity.PsychTestManage;
import com.ucaacp.backend.entity.PsychTestOption;
import com.ucaacp.backend.entity.PsychTestQuestion;
import com.ucaacp.backend.repository.PsychTestManageRepository;
import com.ucaacp.backend.repository.PsychTestManageSummary;
import com.ucaacp.backend.repository.PsychTestOptionRepository;
import com.ucaacp.backend.repository.PsychTestQuestionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class PsychTestManageService {

    @Autowired
    private PsychTestManageRepository psychTestManageRepository;

    @Autowired
    private PsychTestQuestionRepository psychTestQuestionRepository;

    @Autowired
    private PsychTestOptionRepository psychTestOptionRepository;

    public List<PsychTestManageSummary> listSummaries() {
        return psychTestManageRepository.findAllSummaries();
    }

    public Optional<PsychTestManage> findById(Integer testId) {
        if (testId == null) {
            return Optional.empty();
        }
        return psychTestManageRepository.findById(testId);
    }

    public PsychTestManage save(PsychTestManage test) {
        if (test.getCreatedAt() == null) {
            test.setCreatedAt(LocalDateTime.now());
        }
        test.setUpdatedAt(LocalDateTime.now());
        return psychTestManageRepository.save(test);
    }

    public boolean deleteById(Integer testId) {
        if (testId == null || !psychTestManageRepository.existsById(testId)) {
            return false;
        }
        psychTestManageRepository.deleteById(testId);
        return true;
    }

    public List<PsychTestQuestion> listQuestions(Integer testId) {
        if (testId == null) {
            return Collections.emptyList();
        }
        return psychTestQuestionRepository.findByTestIdOrderByOrderIndexAsc(testId);
    }

    public List<PsychTestOption> listOptions(Integer questionId) {
        if (questionId == null) {
            return Collections.emptyList();
        }
        return psychTestOptionRepository.findByQuestionIdOrderByOrderIndexAsc(questionId);
    }

    public PsychTestQuestion addQuestion(Integer testId, PsychTestQuestion question, List<PsychTestOption> options) {
        long count = psychTestQuestionRepository.countByTestId(testId);
        question.setTestId(testId);
        question.setOrderIndex((int) count + 1);
        PsychTestQuestion saved = psychTestQuestionRepository.save(question);
        saveOptions(saved.getQuestionId(), options);
        return saved;
    }

    public Optional<PsychTestQuestion> updateQuestion(Integer questionId, String title, String type, List<PsychTestOption> options) {
        if (questionId == null) {
            return Optional.empty();
        }
        Optional<PsychTestQuestion> optional = psychTestQuestionRepository.findById(questionId);
        if (optional.isEmpty()) {
            return Optional.empty();
        }
        PsychTestQuestion question = optional.get();
        if (title != null) {
            question.setTitle(title);
        }
        if (type != null) {
            question.setType(type);
        }
        PsychTestQuestion saved = psychTestQuestionRepository.save(question);
        if (options != null) {
            psychTestOptionRepository.deleteByQuestionId(questionId);
            saveOptions(questionId, options);
        }
        return Optional.of(saved);
    }

    public boolean deleteQuestion(Integer questionId) {
        if (questionId == null || !psychTestQuestionRepository.existsById(questionId)) {
            return false;
        }
        psychTestOptionRepository.deleteByQuestionId(questionId);
        psychTestQuestionRepository.deleteById(questionId);
        return true;
    }

    public void reorderQuestions(Integer testId, List<Integer> orderedQuestionIds) {
        if (testId == null || orderedQuestionIds == null) {
            return;
        }
        int index = 1;
        for (Integer questionId : orderedQuestionIds) {
            Optional<PsychTestQuestion> optional = psychTestQuestionRepository.findById(questionId);
            if (optional.isEmpty()) {
                continue;
            }
            PsychTestQuestion question = optional.get();
            if (!testId.equals(question.getTestId())) {
                continue;
            }
            question.setOrderIndex(index++);
            psychTestQuestionRepository.save(question);
        }
    }

    private void saveOptions(Integer questionId, List<PsychTestOption> options) {
        if (questionId == null || options == null) {
            return;
        }
        int index = 1;
        List<PsychTestOption> toSave = new ArrayList<>();
        for (PsychTestOption option : options) {
            option.setQuestionId(questionId);
            option.setOrderIndex(index++);
            toSave.add(option);
        }
        psychTestOptionRepository.saveAll(toSave);
    }
}
